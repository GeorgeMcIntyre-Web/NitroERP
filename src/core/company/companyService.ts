import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { cacheService } from '../../services/redisService';
import { logger } from '../../utils/logger';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError 
} from '../../middleware/errorHandler';

export interface CreateCompanyData {
  name: string;
  registration_number: string;
  vat_number?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  currency_code: string;
  timezone: string;
  is_active?: boolean;
}

export interface UpdateCompanyData {
  name?: string;
  registration_number?: string;
  vat_number?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency_code?: string;
  timezone?: string;
  is_active?: boolean;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  manager_id?: string;
  parent_department_id?: string;
  is_active?: boolean;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  manager_id?: string;
  parent_department_id?: string;
  is_active?: boolean;
}

export interface CompanyWithDepartments {
  id: string;
  name: string;
  registration_number: string;
  vat_number?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  currency_code: string;
  timezone: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  departments: Department[];
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  manager_id?: string;
  parent_department_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  parent_department?: {
    id: string;
    name: string;
  };
  sub_departments?: Department[];
}

export class CompanyService {
  /**
   * Create a new company
   */
  async createCompany(data: CreateCompanyData, createdBy: string): Promise<CompanyWithDepartments> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateCompanyData(data);

      // Check if registration number already exists
      const existingCompany = await this.getCompanyByRegistrationNumber(data.registration_number);
      if (existingCompany) {
        throw new ConflictError('Registration number already exists');
      }

      // Start transaction
      const result = await db.transaction(async (trx) => {
        // Create company
        const [company] = await trx('companies').insert({
          id: uuidv4(),
          name: data.name,
          registration_number: data.registration_number,
          vat_number: data.vat_number,
          address_line_1: data.address_line_1,
          address_line_2: data.address_line_2,
          city: data.city,
          state_province: data.state_province,
          postal_code: data.postal_code,
          country: data.country,
          phone: data.phone,
          email: data.email.toLowerCase(),
          website: data.website,
          currency_code: data.currency_code,
          timezone: data.timezone,
          is_active: data.is_active ?? true,
          created_by: createdBy,
          updated_by: createdBy
        }).returning('*');

        // Create default departments
        const defaultDepartments = [
          { name: 'Executive', description: 'Executive management' },
          { name: 'Finance', description: 'Financial management and accounting' },
          { name: 'Human Resources', description: 'HR and personnel management' },
          { name: 'Engineering', description: 'Engineering and design' },
          { name: 'Manufacturing', description: 'Production and manufacturing' },
          { name: 'Sales & Marketing', description: 'Sales and marketing activities' },
          { name: 'IT', description: 'Information technology' },
          { name: 'Operations', description: 'General operations' }
        ];

        const departments = defaultDepartments.map(dept => ({
          id: uuidv4(),
          name: dept.name,
          description: dept.description,
          company_id: company.id,
          is_active: true,
          created_by: createdBy,
          updated_by: createdBy
        }));

        await trx('departments').insert(departments);

        return company;
      });

      // Get company with departments
      const companyWithDepartments = await this.getCompanyWithDepartmentsById(result.id);
      if (!companyWithDepartments) {
        throw new Error('Failed to create company');
      }

      // Clear cache
      await this.clearCompanyCache(result.id);

      logger.info('Company created successfully', {
        companyId: result.id,
        name: result.name,
        createdBy
      });

      return companyWithDepartments;
    } catch (error) {
      logger.error('Error creating company', { error, data });
      throw error;
    }
  }

  /**
   * Get company by ID
   */
  async getCompanyById(companyId: string): Promise<CompanyWithDepartments | null> {
    try {
      // Check cache first
      const cached = await cacheService.get(`company:${companyId}`);
      if (cached) {
        return JSON.parse(cached as string);
      }

      const company = await this.getCompanyWithDepartmentsById(companyId);
      
      if (company) {
        // Cache company data
        await cacheService.set(`company:${companyId}`, JSON.stringify(company), 3600); // 1 hour
      }

      return company;
    } catch (error) {
      logger.error('Error fetching company by ID', { error, companyId });
      throw error;
    }
  }

  /**
   * Get company by registration number
   */
  async getCompanyByRegistrationNumber(registrationNumber: string): Promise<CompanyWithDepartments | null> {
    try {
      const db = getDatabase();
      const company = await db('companies')
        .where('registration_number', registrationNumber)
        .where('deleted_at', null)
        .first();

      if (!company) return null;

      return this.getCompanyWithDepartmentsById(company.id);
    } catch (error) {
      logger.error('Error fetching company by registration number', { error, registrationNumber });
      throw error;
    }
  }

  /**
   * Get all companies (for system administrators)
   */
  async getAllCompanies(): Promise<CompanyWithDepartments[]> {
    try {
      const db = getDatabase();
      const companies = await db('companies')
        .where('deleted_at', null)
        .orderBy('name');

      const companiesWithDepartments = await Promise.all(
        companies.map(company => this.getCompanyWithDepartmentsById(company.id))
      );

      return companiesWithDepartments.filter(Boolean) as CompanyWithDepartments[];
    } catch (error) {
      logger.error('Error fetching all companies', { error });
      throw error;
    }
  }

  /**
   * Update company
   */
  async updateCompany(companyId: string, data: UpdateCompanyData, updatedBy: string): Promise<CompanyWithDepartments> {
    try {
      const db = getDatabase();
      // Check if company exists
      const existingCompany = await this.getCompanyById(companyId);
      if (!existingCompany) {
        throw new NotFoundError('Company not found');
      }

      // Check registration number uniqueness if being updated
      if (data.registration_number && data.registration_number !== existingCompany.registration_number) {
        const registrationExists = await this.getCompanyByRegistrationNumber(data.registration_number);
        if (registrationExists) {
          throw new ConflictError('Registration number already exists');
        }
      }

      // Update company
      const updateData: any = {
        updated_by: updatedBy,
        updated_at: new Date()
      };

      if (data.name) updateData.name = data.name;
      if (data.registration_number) updateData.registration_number = data.registration_number;
      if (data.vat_number !== undefined) updateData.vat_number = data.vat_number;
      if (data.address_line_1) updateData.address_line_1 = data.address_line_1;
      if (data.address_line_2 !== undefined) updateData.address_line_2 = data.address_line_2;
      if (data.city) updateData.city = data.city;
      if (data.state_province) updateData.state_province = data.state_province;
      if (data.postal_code) updateData.postal_code = data.postal_code;
      if (data.country) updateData.country = data.country;
      if (data.phone) updateData.phone = data.phone;
      if (data.email) updateData.email = data.email.toLowerCase();
      if (data.website !== undefined) updateData.website = data.website;
      if (data.currency_code) updateData.currency_code = data.currency_code;
      if (data.timezone) updateData.timezone = data.timezone;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const [result] = await db('companies')
        .where('id', companyId)
        .update(updateData)
        .returning('*');

      // Get updated company with departments
      const updatedCompany = await this.getCompanyWithDepartmentsById(result.id);
      if (!updatedCompany) {
        throw new Error('Failed to update company');
      }

      // Clear cache
      await this.clearCompanyCache(companyId);

      logger.info('Company updated successfully', {
        companyId,
        updatedBy,
        changes: Object.keys(data)
      });

      return updatedCompany;
    } catch (error) {
      logger.error('Error updating company', { error, companyId, data });
      throw error;
    }
  }

  /**
   * Create department
   */
  async createDepartment(companyId: string, data: CreateDepartmentData, createdBy: string): Promise<Department> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateDepartmentData(data);

      // Check if company exists
      const company = await this.getCompanyById(companyId);
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      // Check if department name already exists in company
      const existingDepartment = await this.getDepartmentByName(companyId, data.name);
      if (existingDepartment) {
        throw new ConflictError('Department name already exists in this company');
      }

      // Validate parent department if provided
      if (data.parent_department_id) {
        const parentDepartment = await this.getDepartmentById(data.parent_department_id);
        if (!parentDepartment || parentDepartment.company_id !== companyId) {
          throw new ValidationError('Invalid parent department');
        }
      }

      // Create department
      const [department] = await db('departments').insert({
        id: uuidv4(),
        name: data.name,
        description: data.description,
        company_id: companyId,
        manager_id: data.manager_id,
        parent_department_id: data.parent_department_id,
        is_active: data.is_active ?? true,
        created_by: createdBy,
        updated_by: createdBy
      }).returning('*');

      // Get department with manager and parent info
      const departmentWithDetails = await this.getDepartmentById(department.id);
      if (!departmentWithDetails) {
        throw new Error('Failed to create department');
      }

      // Clear cache
      await this.clearCompanyCache(companyId);

      logger.info('Department created successfully', {
        departmentId: department.id,
        name: department.name,
        companyId,
        createdBy
      });

      return departmentWithDetails;
    } catch (error) {
      logger.error('Error creating department', { error, companyId, data });
      throw error;
    }
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(departmentId: string): Promise<Department | null> {
    try {
      const db = getDatabase();
      const department = await db('departments')
        .select(
          'departments.*',
          'managers.first_name as manager_first_name',
          'managers.last_name as manager_last_name',
          'managers.email as manager_email',
          'parent.name as parent_department_name'
        )
        .leftJoin('users as managers', 'departments.manager_id', 'managers.id')
        .leftJoin('departments as parent', 'departments.parent_department_id', 'parent.id')
        .where('departments.id', departmentId)
        .where('departments.deleted_at', null)
        .first();

      if (!department) return null;

      return {
        id: department.id,
        name: department.name,
        description: department.description,
        company_id: department.company_id,
        manager_id: department.manager_id,
        parent_department_id: department.parent_department_id,
        is_active: department.is_active,
        created_at: department.created_at,
        updated_at: department.updated_at,
        created_by: department.created_by,
        updated_by: department.updated_by,
        manager: department.manager_id ? {
          id: department.manager_id,
          first_name: department.manager_first_name,
          last_name: department.manager_last_name,
          email: department.manager_email
        } : undefined,
        parent_department: department.parent_department_id ? {
          id: department.parent_department_id,
          name: department.parent_department_name
        } : undefined
      };
    } catch (error) {
      logger.error('Error fetching department by ID', { error, departmentId });
      throw error;
    }
  }

  /**
   * Get department by name within a company
   */
  async getDepartmentByName(companyId: string, name: string): Promise<Department | null> {
    try {
      const db = getDatabase();
      const department = await db('departments')
        .where('company_id', companyId)
        .where('name', name)
        .where('deleted_at', null)
        .first();

      if (!department) return null;

      return this.getDepartmentById(department.id);
    } catch (error) {
      logger.error('Error fetching department by name', { error, companyId, name });
      throw error;
    }
  }

  /**
   * Get company with departments
   */
  private async getCompanyWithDepartmentsById(companyId: string): Promise<CompanyWithDepartments | null> {
    try {
      const db = getDatabase();
      const company = await db('companies')
        .where('id', companyId)
        .where('deleted_at', null)
        .first();

      if (!company) return null;

      const departments = await db('departments')
        .where('company_id', companyId)
        .where('deleted_at', null)
        .orderBy('name');

      const departmentsWithDetails = await Promise.all(
        departments.map(dept => this.getDepartmentById(dept.id))
      );

      return {
        ...company,
        departments: departmentsWithDetails.filter(Boolean) as Department[]
      };
    } catch (error) {
      logger.error('Error fetching company with departments', { error, companyId });
      throw error;
    }
  }

  /**
   * Validate company data
   */
  private validateCompanyData(data: CreateCompanyData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Company name is required');
    }

    if (!data.registration_number || data.registration_number.trim().length === 0) {
      throw new ValidationError('Registration number is required');
    }

    if (!data.address_line_1 || data.address_line_1.trim().length === 0) {
      throw new ValidationError('Address line 1 is required');
    }

    if (!data.city || data.city.trim().length === 0) {
      throw new ValidationError('City is required');
    }

    if (!data.state_province || data.state_province.trim().length === 0) {
      throw new ValidationError('State/Province is required');
    }

    if (!data.postal_code || data.postal_code.trim().length === 0) {
      throw new ValidationError('Postal code is required');
    }

    if (!data.country || data.country.trim().length === 0) {
      throw new ValidationError('Country is required');
    }

    if (!data.phone || data.phone.trim().length === 0) {
      throw new ValidationError('Phone number is required');
    }

    if (!data.email || !data.email.includes('@')) {
      throw new ValidationError('Valid email is required');
    }

    if (!data.currency_code || data.currency_code.trim().length === 0) {
      throw new ValidationError('Currency code is required');
    }

    if (!data.timezone || data.timezone.trim().length === 0) {
      throw new ValidationError('Timezone is required');
    }
  }

  /**
   * Validate department data
   */
  private validateDepartmentData(data: CreateDepartmentData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Department name is required');
    }
  }

  /**
   * Clear company cache
   */
  private async clearCompanyCache(companyId: string): Promise<void> {
    try {
      await cacheService.delete(`company:${companyId}`);
    } catch (error) {
      logger.error('Error clearing company cache', { error, companyId });
    }
  }
}

export const companyService = new CompanyService(); 