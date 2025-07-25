#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 NitroERP Setup Script');
console.log('========================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created. Please edit it with your configuration.');
  } else {
    console.log('❌ env.example file not found. Please create .env file manually.');
  }
} else {
  console.log('✅ .env file already exists.');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Dependencies installed successfully.');
  } catch (error) {
    console.log('❌ Failed to install dependencies. Please run "npm install" manually.');
  }
} else {
  console.log('✅ Dependencies already installed.');
}

// Create necessary directories
const directories = [
  'logs',
  'uploads',
  'uploads/avatars',
  'uploads/documents',
  'uploads/designs',
  'docs'
];

console.log('📁 Creating necessary directories...');
directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`✅ Directory already exists: ${dir}`);
  }
});

console.log('\n📋 Setup Instructions:');
console.log('=====================');
console.log('1. Edit the .env file with your database and email configuration');
console.log('2. Create a PostgreSQL database named "nitroerp"');
console.log('3. Create a database user with appropriate permissions');
console.log('4. Run database migrations: npm run db:migrate');
console.log('5. Seed initial data: npm run db:seed');
console.log('6. Start the development server: npm run dev');
console.log('\n📧 Default admin credentials:');
console.log('   Email: admin@nitroerp.com');
console.log('   Password: Admin123!');
console.log('\n🔗 API will be available at: http://localhost:3001');
console.log('📚 API Documentation: http://localhost:3001/api/docs');

console.log('\n🎉 Setup complete! Follow the instructions above to get started.'); 