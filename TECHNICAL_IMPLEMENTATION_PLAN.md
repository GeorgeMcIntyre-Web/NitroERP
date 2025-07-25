# NitroERP Technical Implementation Plan

## Database Schema Design

### Core Tables

#### Users & Authentication
```sql
-- Users table with multi-currency support
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    employee_number VARCHAR(20) UNIQUE,
    department_id UUID REFERENCES departments(id),
    role_id UUID REFERENCES roles(id),
    preferred_currency VARCHAR(3) DEFAULT 'ZAR',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    manager_id UUID REFERENCES users(id),
    budget_limit DECIMAL(15,2) DEFAULT 0,
    budget_currency VARCHAR(3) DEFAULT 'ZAR',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Roles and permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User sessions for audit trail
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Multi-Currency Financial Tables
```sql
-- Exchange rates table
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    effective_date DATE NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'SARB', 'ECB', 'Manual'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, effective_date)
);

-- Chart of accounts with multi-currency support
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    parent_id UUID REFERENCES accounts(id),
    base_currency VARCHAR(3) DEFAULT 'ZAR',
    allowed_currencies VARCHAR(3)[] DEFAULT ARRAY['ZAR'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-currency transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    reference VARCHAR(100),
    description TEXT NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'ZAR',
    base_amount DECIMAL(15,2) NOT NULL,
    foreign_currency VARCHAR(3),
    foreign_amount DECIMAL(15,2),
    exchange_rate DECIMAL(15,6),
    fx_gain_loss DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'DRAFT',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transaction lines
CREATE TABLE transaction_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    cost_center VARCHAR(50),
    project_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Engineering & BOM Tables
```sql
-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    customer_id UUID,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    budget_currency VARCHAR(3) DEFAULT 'ZAR',
    status VARCHAR(20) DEFAULT 'PLANNING',
    project_manager_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bill of Materials
CREATE TABLE bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    revision VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    project_id UUID REFERENCES projects(id),
    status VARCHAR(20) DEFAULT 'DRAFT',
    total_cost DECIMAL(15,2),
    cost_currency VARCHAR(3) DEFAULT 'ZAR',
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(part_number, revision)
);

-- BOM Components
CREATE TABLE bom_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID REFERENCES bom(id) ON DELETE CASCADE,
    component_part_number VARCHAR(100) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) DEFAULT 'PCS',
    reference VARCHAR(50),
    supplier_id UUID,
    unit_cost DECIMAL(15,2),
    cost_currency VARCHAR(3) DEFAULT 'ZAR',
    lead_time_days INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- CAD Integration tracking
CREATE TABLE cad_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID REFERENCES bom(id),
    cad_file_path VARCHAR(500),
    cad_system VARCHAR(50), -- 'SolidWorks', 'AutoCAD', 'Inventor'
    file_hash VARCHAR(64),
    imported_at TIMESTAMP DEFAULT NOW(),
    imported_by UUID REFERENCES users(id)
);
```

#### Manufacturing Tables
```sql
-- Work Orders
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    bom_id UUID REFERENCES bom(id),
    quantity INTEGER NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL',
    status VARCHAR(20) DEFAULT 'PLANNED',
    scheduled_start DATE,
    scheduled_complete DATE,
    actual_start DATE,
    actual_complete DATE,
    total_cost DECIMAL(15,2),
    cost_currency VARCHAR(3) DEFAULT 'ZAR',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Work Order Routing
CREATE TABLE work_order_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    operation_number INTEGER NOT NULL,
    operation_description TEXT NOT NULL,
    work_center VARCHAR(100),
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    status VARCHAR(20) DEFAULT 'PLANNED',
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id)
);

-- Inventory
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'PCS',
    quantity_on_hand DECIMAL(10,3) DEFAULT 0,
    quantity_reserved DECIMAL(10,3) DEFAULT 0,
    reorder_point DECIMAL(10,3) DEFAULT 0,
    reorder_quantity DECIMAL(10,3) DEFAULT 0,
    unit_cost DECIMAL(15,2),
    cost_currency VARCHAR(3) DEFAULT 'ZAR',
    location VARCHAR(100),
    supplier_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Approval Workflow Tables
```sql
-- Approval workflows
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(50) NOT NULL, -- 'ENGINEERING_CHANGE', 'PURCHASE_ORDER', 'WORK_ORDER'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Approval steps
CREATE TABLE approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    approver_role VARCHAR(100),
    approver_department VARCHAR(100),
    amount_threshold DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ZAR',
    is_parallel BOOLEAN DEFAULT false,
    auto_approve BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Approval requests
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES approval_workflows(id),
    request_type VARCHAR(50) NOT NULL,
    request_data JSONB NOT NULL,
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ZAR',
    status VARCHAR(20) DEFAULT 'PENDING',
    requested_by UUID REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Approval decisions
CREATE TABLE approval_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
    step_id UUID REFERENCES approval_steps(id),
    approver_id UUID REFERENCES users(id),
    decision VARCHAR(20) NOT NULL, -- 'APPROVED', 'REJECTED', 'AUTO_APPROVED'
    comments TEXT,
    decided_at TIMESTAMP DEFAULT NOW()
);
```

## Core Service Implementations

### Multi-Currency Financial Service
```typescript
// packages/services/financial/src/services/CurrencyService.ts
export class CurrencyService {
  private readonly sarbApiUrl = 'https://www.resbank.co.za/api/exchangerates';
  private readonly ecbApiUrl = 'https://api.exchangerate.host/latest';

  async getExchangeRate(
    fromCurrency: string, 
    toCurrency: string, 
    date?: Date
  ): Promise<ExchangeRate> {
    const effectiveDate = date || new Date();
    
    // Try SARB first for ZAR pairs
    if (fromCurrency === 'ZAR' || toCurrency === 'ZAR') {
      try {
        return await this.getSARBRate(fromCurrency, toCurrency, effectiveDate);
      } catch (error) {
        console.warn('SARB API failed, falling back to ECB');
      }
    }
    
    // Fall back to ECB
    return await this.getECBRate(fromCurrency, toCurrency, effectiveDate);
  }

  private async getSARBRate(
    fromCurrency: string, 
    toCurrency: string, 
    date: Date
  ): Promise<ExchangeRate> {
    const response = await axios.get(`${this.sarbApiUrl}`, {
      params: {
        date: date.toISOString().split('T')[0],
        currency: fromCurrency === 'ZAR' ? toCurrency : fromCurrency
      }
    });

    const rate = fromCurrency === 'ZAR' 
      ? 1 / response.data.rate 
      : response.data.rate;

    return {
      fromCurrency,
      toCurrency,
      rate,
      effectiveDate: date,
      source: 'SARB'
    };
  }

  async convertAmount(
    amount: Money, 
    toCurrency: string, 
    date?: Date
  ): Promise<Money> {
    if (amount.currency === toCurrency) {
      return amount;
    }

    const exchangeRate = await this.getExchangeRate(
      amount.currency, 
      toCurrency, 
      date
    );

    const convertedAmount = amount.amount * exchangeRate.rate;
    const roundedAmount = this.roundToCurrencyPrecision(
      convertedAmount, 
      toCurrency
    );

    return new Money(roundedAmount, toCurrency);
  }

  private roundToCurrencyPrecision(amount: number, currency: string): number {
    const precision = this.getCurrencyPrecision(currency);
    const multiplier = Math.pow(10, precision);
    return Math.round(amount * multiplier) / multiplier;
  }

  private getCurrencyPrecision(currency: string): number {
    const precisionMap: Record<string, number> = {
      'ZAR': 2, 'USD': 2, 'EUR': 2, 'GBP': 2, 'JPY': 0
    };
    return precisionMap[currency] || 2;
  }
}
```

### Smart Approval Engine
```typescript
// packages/shared/src/workflow/SmartApprovalEngine.ts
export class SmartApprovalEngine {
  constructor(
    private approvalRepository: ApprovalRepository,
    private userService: UserService,
    private riskAssessmentService: RiskAssessmentService
  ) {}

  async processApprovalRequest(request: ApprovalRequest): Promise<ApprovalResult> {
    // Determine approval path based on amount, type, and risk
    const approvalPath = await this.determineApprovalPath(request);
    
    if (approvalPath.autoApprove) {
      return await this.autoApprove(request);
    }

    // Create approval workflow
    const workflow = await this.createApprovalWorkflow(request, approvalPath);
    
    // Send notifications to approvers
    await this.notifyApprovers(workflow);
    
    return {
      status: 'PENDING',
      workflowId: workflow.id,
      estimatedCompletion: this.estimateCompletionTime(approvalPath)
    };
  }

  private async determineApprovalPath(request: ApprovalRequest): Promise<ApprovalPath> {
    const amount = request.amount;
    const type = request.type;
    const risk = await this.riskAssessmentService.assessRisk(request);
    
    // Auto-approve low-risk, low-amount requests
    if (amount < 5000 && risk === 'LOW') {
      return { autoApprove: true, approvers: [] };
    }
    
    // Single approval for medium-risk requests
    if (amount < 25000 && risk === 'MEDIUM') {
      const approver = await this.userService.getDepartmentManager(request.departmentId);
      return { autoApprove: false, approvers: [approver] };
    }
    
    // Multiple approvals for high-risk or high-amount requests
    const approvers = await this.getApproversForAmount(amount, request.departmentId);
    return { autoApprove: false, approvers };
  }

  private async assessRisk(request: ApprovalRequest): Promise<RiskLevel> {
    const factors = await Promise.all([
      this.assessVendorRisk(request.vendorId),
      this.assessProjectRisk(request.projectId),
      this.assessHistoricalRisk(request.requestedBy),
      this.assessAmountRisk(request.amount)
    ]);

    const riskScore = factors.reduce((sum, factor) => sum + factor.score, 0);
    
    if (riskScore < 30) return 'LOW';
    if (riskScore < 70) return 'MEDIUM';
    return 'HIGH';
  }

  private async autoApprove(request: ApprovalRequest): Promise<ApprovalResult> {
    const approval = await this.approvalRepository.create({
      ...request,
      status: 'APPROVED',
      approvedBy: request.requestedBy,
      approvedAt: new Date(),
      autoApproved: true
    });

    // Trigger post-approval actions
    await this.triggerPostApprovalActions(approval);
    
    return {
      status: 'APPROVED',
      approvalId: approval.id,
      autoApproved: true
    };
  }
}
```

### BOM Integration Service
```typescript
// packages/services/engineering/src/services/BOMIntegrationService.ts
export class BOMIntegrationService {
  constructor(
    private bomRepository: BOMRepository,
    private cadParserService: CADParserService,
    private costCalculationService: CostCalculationService
  ) {}

  async processBOMFile(file: Express.Multer.File): Promise<BillOfMaterials> {
    const fileType = this.detectFileType(file);
    
    let bomData: BOMData;
    
    switch (fileType) {
      case 'excel':
        bomData = await this.parseExcelBOM(file);
        break;
      case 'csv':
        bomData = await this.parseCSVBOM(file);
        break;
      case 'pdf':
        bomData = await this.parsePDFBOM(file);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Validate and enhance BOM data
    const enhancedBOM = await this.enhanceBOMData(bomData);
    
    // Calculate costs
    const costedBOM = await this.costCalculationService.calculateBOMCost(enhancedBOM);
    
    // Save to database
    const savedBOM = await this.bomRepository.create(costedBOM);
    
    // Trigger downstream processes
    await this.triggerDownstreamProcesses(savedBOM);
    
    return savedBOM;
  }

  async extractBOMFromCAD(cadFile: Express.Multer.File): Promise<BillOfMaterials> {
    const cadSystem = this.detectCADSystem(cadFile);
    
    let bomData: BOMData;
    
    switch (cadSystem) {
      case 'solidworks':
        bomData = await this.extractFromSolidWorks(cadFile);
        break;
      case 'autocad':
        bomData = await this.extractFromAutoCAD(cadFile);
        break;
      case 'inventor':
        bomData = await this.extractFromInventor(cadFile);
        break;
      default:
        throw new Error(`Unsupported CAD system: ${cadSystem}`);
    }

    return await this.processBOMData(bomData);
  }

  private async enhanceBOMData(bomData: BOMData): Promise<EnhancedBOMData> {
    const enhancedComponents = await Promise.all(
      bomData.components.map(async (component) => {
        // Match with existing parts database
        const matchedPart = await this.matchPartNumber(component.partNumber);
        
        // Get supplier information
        const supplier = await this.getSupplierInfo(component.partNumber);
        
        // Get current pricing
        const pricing = await this.getCurrentPricing(component.partNumber);
        
        return {
          ...component,
          matchedPart,
          supplier,
          pricing,
          leadTime: await this.calculateLeadTime(component.partNumber)
        };
      })
    );

    return {
      ...bomData,
      components: enhancedComponents
    };
  }

  private async triggerDownstreamProcesses(bom: BillOfMaterials): Promise<void> {
    // Notify purchasing department
    await this.notifyPurchasing(bom);
    
    // Update inventory requirements
    await this.updateInventoryRequirements(bom);
    
    // Trigger cost analysis
    await this.triggerCostAnalysis(bom);
    
    // Update project costs
    await this.updateProjectCosts(bom);
  }
}
```

### Real-time Notification Service
```typescript
// packages/shared/src/services/NotificationService.ts
export class NotificationService {
  constructor(
    private socketService: SocketService,
    private emailService: EmailService,
    private notificationRepository: NotificationRepository
  ) {}

  async sendNotification(notification: Notification): Promise<void> {
    // Save notification to database
    const savedNotification = await this.notificationRepository.create(notification);
    
    // Send real-time notification via WebSocket
    await this.sendRealTimeNotification(savedNotification);
    
    // Send email notification if required
    if (notification.sendEmail) {
      await this.sendEmailNotification(savedNotification);
    }
    
    // Send mobile push notification if configured
    if (notification.sendPush) {
      await this.sendPushNotification(savedNotification);
    }
  }

  private async sendRealTimeNotification(notification: Notification): Promise<void> {
    const userSocket = await this.socketService.getUserSocket(notification.userId);
    
    if (userSocket) {
      userSocket.emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: notification.createdAt
      });
    }
  }

  async sendBulkNotification(notifications: Notification[]): Promise<void> {
    // Group notifications by user for efficiency
    const notificationsByUser = this.groupNotificationsByUser(notifications);
    
    // Send notifications in parallel
    await Promise.all(
      Object.entries(notificationsByUser).map(([userId, userNotifications]) =>
        this.sendUserNotifications(userId, userNotifications)
      )
    );
  }

  async subscribeToNotifications(userId: string, channels: string[]): Promise<void> {
    const user = await this.userService.findById(userId);
    
    // Update user notification preferences
    await this.userService.updateNotificationPreferences(userId, channels);
    
    // Subscribe to real-time channels
    await this.socketService.subscribeToChannels(userId, channels);
  }
}
```

## API Endpoints Implementation

### Financial Module API
```typescript
// packages/services/financial/src/routes/accounts.ts
export class AccountRoutes {
  constructor(private accountService: AccountService) {}

  @Get('/accounts')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('financial.accounts.read')
  async getAccounts(@Query() query: GetAccountsQuery): Promise<PaginatedResponse<Account>> {
    return await this.accountService.getAccounts(query);
  }

  @Post('/accounts')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('financial.accounts.create')
  async createAccount(@Body() accountData: CreateAccountDto): Promise<Account> {
    return await this.accountService.createAccount(accountData);
  }

  @Get('/accounts/:id/balance')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('financial.accounts.read')
  async getAccountBalance(
    @Param('id') accountId: string,
    @Query('currency') currency: string = 'ZAR',
    @Query('date') date: string
  ): Promise<AccountBalance> {
    return await this.accountService.getAccountBalance(accountId, currency, date);
  }

  @Post('/transactions')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('financial.transactions.create')
  async createTransaction(@Body() transactionData: CreateTransactionDto): Promise<Transaction> {
    return await this.accountService.createTransaction(transactionData);
  }

  @Get('/exchange-rates')
  @UseGuards(AuthGuard)
  async getExchangeRates(
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
    @Query('date') date?: string
  ): Promise<ExchangeRate[]> {
    return await this.accountService.getExchangeRates(fromCurrency, toCurrency, date);
  }
}
```

### Engineering Module API
```typescript
// packages/services/engineering/src/routes/bom.ts
export class BOMRoutes {
  constructor(private bomService: BOMService) {}

  @Post('/bom/upload')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('engineering.bom.create')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBOM(
    @UploadedFile() file: Express.Multer.File,
    @Body() bomData: CreateBOMDto
  ): Promise<BillOfMaterials> {
    return await this.bomService.processBOMFile(file, bomData);
  }

  @Post('/bom/cad-extract')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('engineering.bom.create')
  @UseInterceptors(FileInterceptor('cadFile'))
  async extractBOMFromCAD(
    @UploadedFile() cadFile: Express.Multer.File,
    @Body() projectData: ProjectData
  ): Promise<BillOfMaterials> {
    return await this.bomService.extractBOMFromCAD(cadFile, projectData);
  }

  @Get('/bom/:id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('engineering.bom.read')
  async getBOM(@Param('id') bomId: string): Promise<BillOfMaterials> {
    return await this.bomService.getBOM(bomId);
  }

  @Put('/bom/:id/approve')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('engineering.bom.approve')
  async approveBOM(
    @Param('id') bomId: string,
    @Body() approvalData: ApprovalData
  ): Promise<BillOfMaterials> {
    return await this.bomService.approveBOM(bomId, approvalData);
  }
}
```

## Frontend Components

### Multi-Currency Input Component
```typescript
// packages/web-app/src/components/common/MultiCurrencyInput.tsx
export const MultiCurrencyInput: React.FC<MultiCurrencyInputProps> = ({
  value,
  currency,
  onValueChange,
  onCurrencyChange,
  supportedCurrencies = ['ZAR', 'USD', 'EUR', 'GBP'],
  disabled = false
}) => {
  const [localValue, setLocalValue] = useState(value?.amount || 0);
  const [localCurrency, setLocalCurrency] = useState(currency || 'ZAR');

  const handleValueChange = (newValue: number) => {
    setLocalValue(newValue);
    onValueChange?.({ amount: newValue, currency: localCurrency });
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setLocalCurrency(newCurrency);
    onCurrencyChange?.(newCurrency);
    onValueChange?.({ amount: localValue, currency: newCurrency });
  };

  return (
    <Box display="flex" gap={1} alignItems="center">
      <TextField
        type="number"
        value={localValue}
        onChange={(e) => handleValueChange(Number(e.target.value))}
        disabled={disabled}
        size="small"
        sx={{ minWidth: 120 }}
      />
      <FormControl size="small" sx={{ minWidth: 80 }}>
        <Select
          value={localCurrency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          disabled={disabled}
        >
          {supportedCurrencies.map((curr) => (
            <MenuItem key={curr} value={curr}>
              {curr}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
```

### BOM Upload Component
```typescript
// packages/web-app/src/components/engineering/BOMUpload.tsx
export const BOMUpload: React.FC<BOMUploadProps> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/engineering/bom/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setUploadProgress(progress);
        }
      });

      onUploadComplete?.(response.data);
    } catch (error) {
      console.error('Upload failed:', error);
      // Handle error
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          textAlign: 'center',
          border: dragActive ? '2px dashed #1976d2' : '1px solid #ddd',
          backgroundColor: dragActive ? '#f5f5f5' : 'white'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFileUpload(file);
        }}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          style={{ display: 'none' }}
          id="bom-upload-input"
        />
        <label htmlFor="bom-upload-input">
          <Button
            variant="contained"
            component="span"
            disabled={uploading}
            startIcon={<CloudUploadIcon />}
          >
            Upload BOM File
          </Button>
        </label>
        
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Drag and drop or click to upload Excel, CSV, or PDF files
        </Typography>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Uploading... {uploadProgress}%
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
```

## Testing Strategy

### Unit Tests
```typescript
// packages/services/financial/src/__tests__/CurrencyService.test.ts
describe('CurrencyService', () => {
  let currencyService: CurrencyService;
  let mockSARBApi: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    mockSARBApi = axios.create() as jest.Mocked<AxiosInstance>;
    currencyService = new CurrencyService();
  });

  describe('getExchangeRate', () => {
    it('should return SARB rate for ZAR pairs', async () => {
      const mockResponse = { data: { rate: 0.055 } };
      mockSARBApi.get.mockResolvedValue(mockResponse);

      const result = await currencyService.getExchangeRate('USD', 'ZAR');

      expect(result.rate).toBe(18.18); // 1/0.055
      expect(result.source).toBe('SARB');
    });

    it('should fall back to ECB for non-ZAR pairs', async () => {
      const mockResponse = { data: { rates: { EUR: 0.85 } } };
      mockSARBApi.get.mockRejectedValue(new Error('SARB API failed'));

      const result = await currencyService.getExchangeRate('USD', 'EUR');

      expect(result.source).toBe('ECB');
    });
  });

  describe('convertAmount', () => {
    it('should convert USD to ZAR correctly', async () => {
      const usdAmount = new Money(100, 'USD');
      const expectedZarAmount = new Money(1820, 'ZAR'); // Assuming 18.20 rate

      const result = await currencyService.convertAmount(usdAmount, 'ZAR');

      expect(result.amount).toBeCloseTo(expectedZarAmount.amount, 2);
      expect(result.currency).toBe('ZAR');
    });
  });
});
```

### Integration Tests
```typescript
// packages/tests/integration/manufacturing-workflow.test.ts
describe('Manufacturing Workflow Integration', () => {
  let testDatabase: TestDatabase;
  let apiClient: ApiClient;

  beforeAll(async () => {
    testDatabase = await setupTestDatabase();
    apiClient = new ApiClient(testDatabase);
  });

  afterAll(async () => {
    await testDatabase.cleanup();
  });

  test('Complete BOM to Work Order workflow', async () => {
    // 1. Create project
    const project = await apiClient.createProject({
      projectNumber: 'TEST-001',
      name: 'Test Project',
      customerId: 'test-customer'
    });

    // 2. Upload BOM
    const bomFile = createTestBOMFile();
    const bom = await apiClient.uploadBOM(bomFile, {
      projectId: project.id,
      description: 'Test BOM'
    });

    // 3. Approve BOM
    const approvedBOM = await apiClient.approveBOM(bom.id, {
      approvedBy: 'test-approver',
      comments: 'Approved for production'
    });

    // 4. Create work order
    const workOrder = await apiClient.createWorkOrder({
      partNumber: bom.partNumber,
      bomId: bom.id,
      quantity: 10,
      priority: 'NORMAL'
    });

    // 5. Verify work order was created correctly
    expect(workOrder.status).toBe('PLANNED');
    expect(workOrder.bomId).toBe(bom.id);
    expect(workOrder.quantity).toBe(10);

    // 6. Verify inventory requirements were updated
    const inventoryRequirements = await apiClient.getInventoryRequirements(workOrder.id);
    expect(inventoryRequirements.length).toBeGreaterThan(0);
  });
});
```

This technical implementation plan provides the foundation for building NitroERP with enterprise-grade features, multi-currency support, and optimized workflows. The modular architecture ensures scalability and maintainability while the comprehensive testing strategy guarantees reliability. 