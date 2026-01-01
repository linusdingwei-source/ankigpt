import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    
    // 解决 Prisma 7 的 node: 前缀问题
    // webpack 对象由 Next.js 提供，不需要导入
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^node:/,
        (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        }
      )
    );

    // 忽略可选存储依赖，避免构建时检查
    // 这些依赖只在运行时动态加载（如果已安装）
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(ali-oss|@aws-sdk\/client-s3)$/,
      })
    );
    
    return config;
  },
};

export default withNextIntl(nextConfig);
