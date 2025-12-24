#!/usr/bin/env node

/**
 * 更新 .env 文件的 Supabase 配置
 * 使用方法: node update-env.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

// 正确的 Supabase 配置
const supabaseConfig = {
  DATABASE_URL: 'postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  DIRECT_URL: 'postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres',
};

function updateEnvFile() {
  try {
    // 读取现有 .env 文件
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('✅ 找到现有 .env 文件\n');
    } else {
      console.log('⚠️  .env 文件不存在，将创建新文件\n');
    }

    // 更新或添加 DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL="${supabaseConfig.DATABASE_URL}"`
      );
      console.log('✅ 更新了 DATABASE_URL');
    } else {
      // 在文件开头添加
      envContent = `# Database - Supabase\nDATABASE_URL="${supabaseConfig.DATABASE_URL}"\n\n${envContent}`;
      console.log('✅ 添加了 DATABASE_URL');
    }

    // 更新或添加 DIRECT_URL
    if (envContent.includes('DIRECT_URL=')) {
      envContent = envContent.replace(
        /DIRECT_URL=.*/,
        `DIRECT_URL="${supabaseConfig.DIRECT_URL}"`
      );
      console.log('✅ 更新了 DIRECT_URL');
    } else {
      // 在 DATABASE_URL 后添加
      envContent = envContent.replace(
        /DATABASE_URL="[^"]*"/,
        `DATABASE_URL="${supabaseConfig.DATABASE_URL}"\nDIRECT_URL="${supabaseConfig.DIRECT_URL}"`
      );
      if (!envContent.includes('DIRECT_URL=')) {
        envContent = envContent.replace(
          /(DATABASE_URL="[^"]*")/,
          `$1\nDIRECT_URL="${supabaseConfig.DIRECT_URL}"`
        );
      }
      console.log('✅ 添加了 DIRECT_URL');
    }

    // 确保 DIRECT_URL 使用正确的格式
    const directUrlRegex = /DIRECT_URL="([^"]*)"/;
    const match = envContent.match(directUrlRegex);
    if (match) {
      const currentUrl = match[1];
      if (currentUrl.includes('pooler') || !currentUrl.includes('db.qkvgeuallarmbcfjzkko.supabase.co')) {
        envContent = envContent.replace(
          directUrlRegex,
          `DIRECT_URL="${supabaseConfig.DIRECT_URL}"`
        );
        console.log('✅ 修正了 DIRECT_URL 格式（使用正确的直接连接地址）');
      }
    }

    // 写入文件
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('\n✅ .env 文件已更新！');
    console.log('\n配置详情:');
    console.log(`  DATABASE_URL: ${supabaseConfig.DATABASE_URL.split('@')[0]}@...`);
    console.log(`  DIRECT_URL: ${supabaseConfig.DIRECT_URL.split('@')[0]}@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres`);
    console.log('\n下一步:');
    console.log('  1. 运行: node check-env.js (验证配置)');
    console.log('  2. 运行: npx prisma db push (推送数据库 Schema)');
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('\n请手动更新 .env 文件:');
    console.log('\n添加或更新以下配置:');
    console.log(`DATABASE_URL="${supabaseConfig.DATABASE_URL}"`);
    console.log(`DIRECT_URL="${supabaseConfig.DIRECT_URL}"`);
    process.exit(1);
  }
}

// 运行更新
updateEnvFile();

