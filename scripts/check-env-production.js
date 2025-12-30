#!/usr/bin/env node

/**
 * 检查生产环境必需的环境变量
 * 使用方法: node scripts/check-env-production.js
 */

const requiredVars = [
  'AUTH_SECRET',
  'NEXTAUTH_URL',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

const optionalVars = [
  'DIRECT_URL',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_GA_ID',
];

console.log('🔍 Checking environment variables...\n');

let allRequiredSet = true;

// 检查必需变量
console.log('📋 Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // 隐藏敏感信息，只显示前几个字符
    const displayValue = varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('KEY')
      ? `${value.substring(0, 10)}...`
      : value.length > 50
      ? `${value.substring(0, 50)}...`
      : value;
    console.log(`  ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
    allRequiredSet = false;
  }
});

// 检查可选变量
console.log('\n📋 Optional Environment Variables:');
let optionalSetCount = 0;
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('KEY')
      ? `${value.substring(0, 10)}...`
      : value.length > 50
      ? `${value.substring(0, 50)}...`
      : value;
    console.log(`  ✅ ${varName}: ${displayValue}`);
    optionalSetCount++;
  } else {
    console.log(`  ⚠️  ${varName}: Not set (optional)`);
  }
});

// 总结
console.log('\n' + '='.repeat(50));
if (allRequiredSet) {
  console.log('✅ All required environment variables are set!');
  console.log(`ℹ️  ${optionalSetCount}/${optionalVars.length} optional variables are set.`);
  process.exit(0);
} else {
  console.log('❌ Some required environment variables are missing!');
  console.log('\nPlease set the following variables in Vercel:');
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      console.log(`  - ${varName}`);
    }
  });
  process.exit(1);
}

