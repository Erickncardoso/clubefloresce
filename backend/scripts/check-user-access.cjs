const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function isPatientAccessExpired(accessExpiresAt) {
  if (!accessExpiresAt) return false
  const expiresAt = accessExpiresAt instanceof Date ? accessExpiresAt : new Date(accessExpiresAt)
  if (Number.isNaN(expiresAt.getTime())) return false
  return Date.now() > expiresAt.getTime()
}

function isPatientManuallyGrantedAccess(fields) {
  if (!fields.approvalEmailSentAt) return false
  if (!fields.accessExpiresAt) return true
  return !isPatientAccessExpired(fields.accessExpiresAt)
}

function isPatientPaidAccessActive(plan, accessExpiresAt, approvalEmailSentAt) {
  if (isPatientManuallyGrantedAccess({ plan, accessExpiresAt, approvalEmailSentAt })) return true
  const normalizedPlan = String(plan || 'FREE').toUpperCase()
  if (normalizedPlan === 'FREE') return false
  return !isPatientAccessExpired(accessExpiresAt)
}

function isPatientAppAccessBlocked(plan, accessExpiresAt, approvalEmailSentAt) {
  return !isPatientPaidAccessActive(plan, accessExpiresAt, approvalEmailSentAt)
}

async function main() {
  const email = process.argv[2] || 'erickpsncardoso@gmail.com'
  const u = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      plan: true,
      accessExpiresAt: true,
      approvalEmailSentAt: true,
      status: true,
      role: true,
    },
  })
  console.log(JSON.stringify(u, null, 2))
  if (u?.accessExpiresAt) {
    console.log('expired?', Date.now() > new Date(u.accessExpiresAt).getTime())
  }
  if (u?.id) {
    const subs = await prisma.billingSubscription.findMany({
      where: { userId: u.id },
      select: { status: true, plan: true, paymentMethod: true, currentPeriodEnd: true },
    })
    console.log('subscriptions', JSON.stringify(subs, null, 2))
    console.log('blocked?', isPatientAppAccessBlocked(u.plan, u.accessExpiresAt, u.approvalEmailSentAt))
  }
}

main().finally(() => prisma.$disconnect())
