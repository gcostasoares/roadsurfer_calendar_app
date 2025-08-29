import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}'
  },
  component: {
    devServer: { framework: 'vue', bundler: 'vite' },
    supportFile: 'cypress/support/component.js',
    specPattern: 'src/**/*.cy.{js,ts,vue}'
  }
})
