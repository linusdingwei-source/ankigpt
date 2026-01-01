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

    // 将可选存储依赖标记为外部依赖，避免构建时检查
    // 这些依赖只在运行时动态导入
    if (isServer) {
      config.externals = config.externals || [];
      // 如果 externals 是数组，添加新的外部依赖
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'ali-oss': 'commonjs ali-oss',
          '@aws-sdk/client-s3': 'commonjs @aws-sdk/client-s3',
        });
      } else {
        // 如果 externals 是对象，合并
        config.externals = {
          ...config.externals,
          'ali-oss': 'commonjs ali-oss',
          '@aws-sdk/client-s3': 'commonjs @aws-sdk/client-s3',
        };
      }
    }
    
    return config;
  },
};

export default withNextIntl(nextConfig);
