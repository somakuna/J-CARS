import type { IncomingMessage } from 'node:http'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import pkg from './package.json' with { type: 'json' }

/**
 * Samo za `npm run dev`: izvršava funkcije iz /api (kao Vercel), pa se probne
 * obavijesti mogu isprobati lokalno. Tajne dolaze iz .env.local u process.env.
 * Na Vercelu se ovo ne koristi – tamo /api izvršava sam Vercel.
 */
function apiDevServer(mode: string): Plugin {
  return {
    name: 'jcars-api-dev',
    apply: 'serve',
    configureServer(server) {
      for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
        if (!key.startsWith('VITE_') && process.env[key] === undefined) process.env[key] = value
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()

        const route = url.pathname.slice('/api/'.length)
        // Mape i datoteke koje počinju s „_” su pomoćni moduli, ne endpointi (kao na Vercelu).
        if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(route) || route.split('/').some((part) => part.startsWith('_'))) {
          res.statusCode = 404
          return res.end()
        }

        try {
          const mod = (await server.ssrLoadModule(`/api/${route}.ts`)) as Record<string, unknown>
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end()
          }
          const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
          }
          const response = (await handler(new Request(url, { method: req.method, headers, body }))) as Response
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          if (error instanceof Error && /Failed to load url|does not exist/i.test(error.message)) {
            res.statusCode = 404
            return res.end()
          }
          server.config.logger.error(`[api] ${req.method} ${url.pathname}: ${error instanceof Error ? error.stack : String(error)}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Greška na lokalnom poslužitelju (vidi terminal).' }))
        }
      })
    },
  }
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), apiDevServer(mode)],
  build: {
    rolldownOptions: {
      output: {
        // Biblioteke u zasebnim datotekama – rijetko se mijenjaju pa ih preglednik dulje pamti.
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
}))
