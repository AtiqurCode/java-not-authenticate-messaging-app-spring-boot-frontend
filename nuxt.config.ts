// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/image'],

  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8081/api/v1',
      pusherKey: '',
      pusherCluster: 'ap1'
    }
  },

  routeRules: {
    '/': { prerender: false }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
})