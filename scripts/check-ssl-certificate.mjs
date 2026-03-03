#!/usr/bin/env node

import tls from 'node:tls'

const domain = process.env.SSL_CHECK_DOMAIN
const minValidDays = Number(process.env.SSL_MIN_VALID_DAYS || 30)

if (!domain) {
  console.error('❌ SSL_CHECK_DOMAIN is required (example: app.example.com)')
  process.exit(1)
}

function daysUntil(dateString) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  return Math.floor((then - now) / (1000 * 60 * 60 * 24))
}

function checkTlsCertificate(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: true,
      },
      () => {
        const cert = socket.getPeerCertificate()
        if (!cert || !cert.valid_to) {
          socket.end()
          reject(new Error('No certificate returned by server'))
          return
        }

        const remainingDays = daysUntil(cert.valid_to)
        const subject = cert.subject?.CN || 'unknown'
        const issuer = cert.issuer?.O || cert.issuer?.CN || 'unknown'
        socket.end()

        resolve({
          subject,
          issuer,
          validTo: cert.valid_to,
          remainingDays,
        })
      }
    )

    socket.on('error', (error) => reject(error))
  })
}

async function checkHttpRedirect(hostname) {
  const response = await fetch(`http://${hostname}`, { redirect: 'manual' })
  const location = response.headers.get('location') || ''
  const okStatus = response.status === 301 || response.status === 308
  const okLocation = location.startsWith(`https://${hostname}`) || location.startsWith('https://')

  return {
    status: response.status,
    location,
    isValidRedirect: okStatus && okLocation,
  }
}

async function main() {
  try {
    console.log(`🔐 Checking TLS certificate for ${domain} ...`)
    const cert = await checkTlsCertificate(domain)
    console.log(`✅ Certificate subject: ${cert.subject}`)
    console.log(`✅ Certificate issuer: ${cert.issuer}`)
    console.log(`✅ Certificate valid until: ${cert.validTo}`)
    console.log(`✅ Remaining validity: ${cert.remainingDays} days`)

    if (cert.remainingDays < minValidDays) {
      console.error(`❌ Certificate validity below threshold (${minValidDays} days)`)
      process.exit(1)
    }

    console.log(`↪️  Checking HTTP redirect for ${domain} ...`)
    const redirect = await checkHttpRedirect(domain)
    if (!redirect.isValidRedirect) {
      console.error('❌ HTTP redirect check failed')
      console.error(`   Status: ${redirect.status}`)
      console.error(`   Location: ${redirect.location || '(missing)'}`)
      process.exit(1)
    }

    console.log(`✅ Redirect status: ${redirect.status}`)
    console.log(`✅ Redirect location: ${redirect.location}`)
    console.log('🎉 SSL checks passed')
  } catch (error) {
    console.error(`❌ SSL check failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main()
