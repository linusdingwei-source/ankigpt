// 临时脚本：检查环境变量
require('dotenv').config();

console.log('=== 环境变量检查 ===\n');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const host = dbUrl.match(/@([^:]+):/)?.[1] || '未找到';
  const port = dbUrl.match(/:(\d+)\//)?.[1] || '未找到';
  console.log('  - 主机:', host);
  console.log('  - 端口:', port);
}

console.log('\nDIRECT_URL:', process.env.DIRECT_URL ? '已设置' : '未设置');
if (process.env.DIRECT_URL) {
  const directUrl = process.env.DIRECT_URL;
  const host = directUrl.match(/@([^:]+):/)?.[1] || '未找到';
  const port = directUrl.match(/:(\d+)\//)?.[1] || '未找到';
  const user = directUrl.match(/\/\/([^:]+):/)?.[1] || '未找到';
  console.log('  - 主机:', host);
  console.log('  - 端口:', port);
  console.log('  - 用户:', user);
  
  // 检查是否正确
  if (host.includes('pooler')) {
    console.log('  ⚠️  警告: DIRECT_URL 使用了 pooler 地址，应该使用 db.[PROJECT-REF].supabase.co');
  } else if (host.includes('db.') && host.includes('.supabase.co')) {
    console.log('  ✅ DIRECT_URL 格式正确');
  }
} else {
  console.log('  ⚠️  错误: DIRECT_URL 未设置！');
}

console.log('\n=== 检查完成 ===');

