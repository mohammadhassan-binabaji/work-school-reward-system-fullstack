// vite.config.ts
import { defineConfig } from "file:///C:/Users/wwwmo/OneDrive/Desktop/coding/learning/copilot/playground/002%20prd.agent/frontend/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/wwwmo/OneDrive/Desktop/coding/learning/copilot/playground/002%20prd.agent/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { VitePWA } from "file:///C:/Users/wwwmo/OneDrive/Desktop/coding/learning/copilot/playground/002%20prd.agent/frontend/node_modules/vite-plugin-pwa/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\wwwmo\\OneDrive\\Desktop\\coding\\learning\\copilot\\playground\\002 prd.agent\\frontend\\apps\\student";
var vite_config_default = defineConfig({
  base: process.env.VITE_BASE_URL || "/",
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: {
        name: "\u0633\u0627\u0645\u0627\u0646\u0647 \u067E\u0627\u062F\u0627\u0634 \u062F\u0627\u0646\u0634\u200C\u0622\u0645\u0648\u0632\u06CC - \u067E\u0646\u0644 \u062F\u0627\u0646\u0634\u200C\u0622\u0645\u0648\u0632",
        short_name: "\u0646\u0648\u06CC\u0646 \u0645\u0646",
        description: "\u0633\u0627\u0645\u0627\u0646\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u067E\u0627\u062F\u0627\u0634 \u0648 \u0645\u0627\u0645\u0648\u0631\u06CC\u062A\u200C\u0647\u0627\u06CC \u062F\u0627\u0646\u0634\u200C\u0622\u0645\u0648\u0632\u06CC \u0646\u0648\u06CC\u0646 \u0645\u0646",
        theme_color: "#0B0E14",
        background_color: "#0B0E14",
        display: "standalone",
        orientation: "portrait",
        start_url: process.env.VITE_BASE_URL || "/",
        scope: process.env.VITE_BASE_URL || "/",
        lang: "fa",
        dir: "rtl",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff,woff2}"],
        navigateFallbackDenylist: [/^\/api\//, /^\/download\//],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@student-reward/shared": path.resolve(__vite_injected_original_dirname, "../../packages/shared/src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api/v1": {
        target: "http://localhost:3000",
        changeOrigin: false
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx3d3dtb1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXGNvZGluZ1xcXFxsZWFybmluZ1xcXFxjb3BpbG90XFxcXHBsYXlncm91bmRcXFxcMDAyIHByZC5hZ2VudFxcXFxmcm9udGVuZFxcXFxhcHBzXFxcXHN0dWRlbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHd3d21vXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcY29kaW5nXFxcXGxlYXJuaW5nXFxcXGNvcGlsb3RcXFxccGxheWdyb3VuZFxcXFwwMDIgcHJkLmFnZW50XFxcXGZyb250ZW5kXFxcXGFwcHNcXFxcc3R1ZGVudFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvd3d3bW8vT25lRHJpdmUvRGVza3RvcC9jb2RpbmcvbGVhcm5pbmcvY29waWxvdC9wbGF5Z3JvdW5kLzAwMiUyMHByZC5hZ2VudC9mcm9udGVuZC9hcHBzL3N0dWRlbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnO1xyXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGJhc2U6IHByb2Nlc3MuZW52LlZJVEVfQkFTRV9VUkwgfHwgJy8nLFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHZ1ZSgpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICBpbmplY3RSZWdpc3RlcjogbnVsbCxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICBuYW1lOiAnXHUwNjMzXHUwNjI3XHUwNjQ1XHUwNjI3XHUwNjQ2XHUwNjQ3IFx1MDY3RVx1MDYyN1x1MDYyRlx1MDYyN1x1MDYzNCBcdTA2MkZcdTA2MjdcdTA2NDZcdTA2MzRcdTIwMENcdTA2MjJcdTA2NDVcdTA2NDhcdTA2MzJcdTA2Q0MgLSBcdTA2N0VcdTA2NDZcdTA2NDQgXHUwNjJGXHUwNjI3XHUwNjQ2XHUwNjM0XHUyMDBDXHUwNjIyXHUwNjQ1XHUwNjQ4XHUwNjMyJyxcclxuICAgICAgICBzaG9ydF9uYW1lOiAnXHUwNjQ2XHUwNjQ4XHUwNkNDXHUwNjQ2IFx1MDY0NVx1MDY0NicsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdcdTA2MzNcdTA2MjdcdTA2NDVcdTA2MjdcdTA2NDZcdTA2NDcgXHUwNjQ3XHUwNjQ4XHUwNjM0XHUwNjQ1XHUwNjQ2XHUwNjJGIFx1MDY3RVx1MDYyN1x1MDYyRlx1MDYyN1x1MDYzNCBcdTA2NDggXHUwNjQ1XHUwNjI3XHUwNjQ1XHUwNjQ4XHUwNjMxXHUwNkNDXHUwNjJBXHUyMDBDXHUwNjQ3XHUwNjI3XHUwNkNDIFx1MDYyRlx1MDYyN1x1MDY0Nlx1MDYzNFx1MjAwQ1x1MDYyMlx1MDY0NVx1MDY0OFx1MDYzMlx1MDZDQyBcdTA2NDZcdTA2NDhcdTA2Q0NcdTA2NDYgXHUwNjQ1XHUwNjQ2JyxcclxuICAgICAgICB0aGVtZV9jb2xvcjogJyMwQjBFMTQnLFxyXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjMEIwRTE0JyxcclxuICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXHJcbiAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXHJcbiAgICAgICAgc3RhcnRfdXJsOiBwcm9jZXNzLmVudi5WSVRFX0JBU0VfVVJMIHx8ICcvJyxcclxuICAgICAgICBzY29wZTogcHJvY2Vzcy5lbnYuVklURV9CQVNFX1VSTCB8fCAnLycsXHJcbiAgICAgICAgbGFuZzogJ2ZhJyxcclxuICAgICAgICBkaXI6ICdydGwnLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3B3YS0xOTJ4MTkyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3B3YS01MTJ4NTEyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3B3YS1tYXNrYWJsZS0xOTJ4MTkyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnbWFza2FibGUnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAncHdhLW1hc2thYmxlLTUxMng1MTIucG5nJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6ICdtYXNrYWJsZScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsanNvbix3b2ZmLHdvZmYyfSddLFxyXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2tEZW55bGlzdDogWy9eXFwvYXBpXFwvLywgL15cXC9kb3dubG9hZFxcLy9dLFxyXG4gICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcclxuICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogMyAqIDEwMjQgKiAxMDI0LFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG4gICAgICAnQHN0dWRlbnQtcmV3YXJkL3NoYXJlZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9wYWNrYWdlcy9zaGFyZWQvc3JjJyksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGkvdjEnOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnZ0IsU0FBUyxvQkFBb0I7QUFDN2hCLE9BQU8sU0FBUztBQUNoQixTQUFTLGVBQWU7QUFDeEIsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU0sUUFBUSxJQUFJLGlCQUFpQjtBQUFBLEVBQ25DLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGdCQUFnQjtBQUFBLE1BQ2hCLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULGFBQWE7QUFBQSxRQUNiLFdBQVcsUUFBUSxJQUFJLGlCQUFpQjtBQUFBLFFBQ3hDLE9BQU8sUUFBUSxJQUFJLGlCQUFpQjtBQUFBLFFBQ3BDLE1BQU07QUFBQSxRQUNOLEtBQUs7QUFBQSxRQUNMLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLFNBQVM7QUFBQSxVQUNYO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxjQUFjLENBQUMsZ0RBQWdEO0FBQUEsUUFDL0QsMEJBQTBCLENBQUMsWUFBWSxlQUFlO0FBQUEsUUFDdEQsdUJBQXVCO0FBQUEsUUFDdkIsK0JBQStCLElBQUksT0FBTztBQUFBLE1BQzVDO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3BDLDBCQUEwQixLQUFLLFFBQVEsa0NBQVcsMkJBQTJCO0FBQUEsSUFDL0U7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxXQUFXO0FBQUEsUUFDVCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
