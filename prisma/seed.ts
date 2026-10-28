/**
 * Seed — სასწავლო მონაცემები.
 *
 * ეს არ არის "ორი ლამაზი ჩანაწერი". მონაცემები შეგნებულად ისეა აწყობილი,
 * რომ სავარჯიშოები **შესამოწმებელი** გახდეს:
 *   • სამი როლი სხვადასხვა ჩანაწერებით → #04 (role scope) რომ დაინახო,
 *     ADMIN/MANAGER/SALES_REP სხვადასხვა რაოდენობას უნდა ხედავდნენ
 *   • მენეჯერი ორი ქვეშევრდომით + ერთი "უგუნდო" გამყიდველი → #08
 *   • გარიგებები ყველა ეტაპზე, სხვადასხვა თანხით და თარიღით → #05, #10
 *   • ვადაგადაცილებული და შესრულებული აქტივობები → #10
 *
 * id-ები ფიქსირებულია (და არა შემთხვევითი), რომ e2e ტესტებმა კონკრეტულ
 * ჩანაწერებზე შეძლონ მითითება და შედეგი ყოველ გაშვებაზე ერთნაირი იყოს.
 *
 * გაშვება: npm run db:seed
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  ActivityType,
  CompanyStatus,
  DealStage,
  PrismaClient,
  Role,
} from '../src/prisma-client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** ერთი პაროლი ყველასთვის — მხოლოდ development-ისთვის. */
const PASSWORD = 'Password123!';

const USER = {
  admin: '01930000-0000-7000-8000-000000000001',
  manager: '01930000-0000-7000-8000-000000000002',
  rep1: '01930000-0000-7000-8000-000000000003',
  rep2: '01930000-0000-7000-8000-000000000004',
  loneRep: '01930000-0000-7000-8000-000000000005',
} as const;

const COMPANY = {
  acme: '01930000-0000-7000-8000-00000000a001',
  globex: '01930000-0000-7000-8000-00000000a002',
  initech: '01930000-0000-7000-8000-00000000a003',
  umbrella: '01930000-0000-7000-8000-00000000a004',
} as const;

/** დღეების დამატება/გამოკლება მიმდინარე დროს. */
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  console.log('🌱 Seed იწყება...');

  // ── წაშლა FK-ების პატივისცემით: ჯერ "შვილები", მერე "მშობლები".
  // Deal → Company არის Restrict, ამიტომ გარიგებები კომპანიებამდე იშლება.
  await prisma.activity.deleteMany();
  await prisma.dealStageHistory.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash(PASSWORD, 10);

  // ── მომხმარებლები და გუნდური იერარქია ──────────────────────────────────
  await prisma.user.create({
    data: {
      id: USER.admin,
      email: 'admin@crm.test',
      password,
      firstName: 'ანა',
      lastName: 'ადმინაძე',
      role: Role.ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      id: USER.manager,
      email: 'manager@crm.test',
      password,
      firstName: 'გიორგი',
      lastName: 'მენეჯიძე',
      role: Role.MANAGER,
    },
  });

  // ორი გამყიდველი მენეჯერის ქვეშ — #04/#08-ის შესამოწმებლად.
  await prisma.user.create({
    data: {
      id: USER.rep1,
      email: 'rep1@crm.test',
      password,
      firstName: 'ნინო',
      lastName: 'გამყიდველი',
      role: Role.SALES_REP,
      managerId: USER.manager,
    },
  });

  await prisma.user.create({
    data: {
      id: USER.rep2,
      email: 'rep2@crm.test',
      password,
      firstName: 'ლევან',
      lastName: 'გაყიდვაძე',
      role: Role.SALES_REP,
      managerId: USER.manager,
    },
  });

  // ⚠️ შეგნებულად **უმენეჯერო** გამყიდველი: მისი ჩანაწერები მენეჯერს
  // არ უნდა უჩანდეს მაშინაც კი, როცა #04 და #08 დასრულებული გექნება.
  // ეს არის "negative test case" შენი role-scope ლოგიკისთვის.
  await prisma.user.create({
    data: {
      id: USER.loneRep,
      email: 'lone@crm.test',
      password,
      firstName: 'თამარ',
      lastName: 'დამოუკიდებელი',
      role: Role.SALES_REP,
    },
  });

  // ── კომპანიები, გადანაწილებული სხვადასხვა მფლობელზე ────────────────────
  await prisma.company.createMany({
    data: [
      {
        id: COMPANY.acme,
        name: 'Acme Georgia LLC',
        domain: 'acme.ge',
        industry: 'Logistics',
        size: 250,
        status: CompanyStatus.CUSTOMER,
        ownerId: USER.rep1,
      },
      {
        id: COMPANY.globex,
        name: 'Globex Trading',
        domain: 'globex.com',
        industry: 'Retail',
        size: 1200,
        status: CompanyStatus.PROSPECT,
        ownerId: USER.rep2,
      },
      {
        id: COMPANY.initech,
        name: 'Initech Systems',
        domain: 'initech.io',
        industry: 'Software',
        size: 80,
        status: CompanyStatus.LEAD,
        ownerId: USER.manager,
      },
      {
        // უმენეჯერო გამყიდველის კომპანია — მენეჯერს არ უნდა ხედავდეს.
        id: COMPANY.umbrella,
        name: 'Umbrella Pharma',
        domain: 'umbrella.health',
        industry: 'Pharmaceuticals',
        size: 5000,
        status: CompanyStatus.CHURNED,
        ownerId: USER.loneRep,
      },
    ],
  });

  // ── კონტაქტები ─────────────────────────────────────────────────────────
  await prisma.contact.createMany({
    data: [
      {
        firstName: 'დავით',
        lastName: 'ქავთარაძე',
        email: 'david@acme.ge',
        phone: '+995555100100',
        position: 'CTO',
        companyId: COMPANY.acme,
        ownerId: USER.rep1,
      },
      {
        firstName: 'მარიამ',
        lastName: 'ლომიძე',
        email: 'mariam@acme.ge',
        position: 'Head of Procurement',
        companyId: COMPANY.acme,
        ownerId: USER.rep1,
      },
      {
        firstName: 'John',
        lastName: 'Carter',
        email: 'john@globex.com',
        position: 'COO',
        companyId: COMPANY.globex,
        ownerId: USER.rep2,
      },
      {
        firstName: 'ირაკლი',
        lastName: 'ბერიძე',
        email: 'irakli@initech.io',
        position: 'CEO',
        companyId: COMPANY.initech,
        ownerId: USER.manager,
      },
      {
        firstName: 'Sarah',
        lastName: 'Lee',
        email: 'sarah@umbrella.health',
        position: 'VP Sales',
        companyId: COMPANY.umbrella,
        ownerId: USER.loneRep,
      },
    ],
  });

  // ── გარიგებები: ყველა ეტაპი, სხვადასხვა თანხა და თარიღი ───────────────
  const deals = [
    // rep1 — Acme
    { title: 'Acme — WMS ლიცენზიები', amount: '45000.00', stage: DealStage.WON, probability: 100, owner: USER.rep1, company: COMPANY.acme, closed: daysFromNow(-20) },
    { title: 'Acme — ტრენინგები', amount: '8500.00', stage: DealStage.NEGOTIATION, probability: 75, owner: USER.rep1, company: COMPANY.acme, expected: daysFromNow(14) },
    { title: 'Acme — მხარდაჭერის პაკეტი', amount: '12000.00', stage: DealStage.PROPOSAL, probability: 50, owner: USER.rep1, company: COMPANY.acme, expected: daysFromNow(25) },
    { title: 'Acme — API ინტეგრაცია', amount: '3200.50', stage: DealStage.LOST, probability: 0, owner: USER.rep1, company: COMPANY.acme, closed: daysFromNow(-5), lostReason: 'ბიუჯეტი გადავიდა მომავალ წელს' },

    // rep2 — Globex
    { title: 'Globex — POS სისტემა', amount: '120000.00', stage: DealStage.NEGOTIATION, probability: 75, owner: USER.rep2, company: COMPANY.globex, expected: daysFromNow(10) },
    { title: 'Globex — პილოტი 5 მაღაზიაში', amount: '15000.00', stage: DealStage.QUALIFIED, probability: 25, owner: USER.rep2, company: COMPANY.globex, expected: daysFromNow(45) },
    { title: 'Globex — ანალიტიკის მოდული', amount: '27500.00', stage: DealStage.WON, probability: 100, owner: USER.rep2, company: COMPANY.globex, closed: daysFromNow(-40) },

    // manager — Initech
    { title: 'Initech — SaaS ხელშეკრულება', amount: '64000.00', stage: DealStage.PROPOSAL, probability: 50, owner: USER.manager, company: COMPANY.initech, expected: daysFromNow(20) },
    { title: 'Initech — მიგრაცია', amount: '9800.00', stage: DealStage.LEAD, probability: 10, owner: USER.manager, company: COMPANY.initech, expected: daysFromNow(60) },

    // loneRep — Umbrella (მენეჯერს არ ეხება)
    { title: 'Umbrella — CRM განახლება', amount: '88000.00', stage: DealStage.QUALIFIED, probability: 25, owner: USER.loneRep, company: COMPANY.umbrella, expected: daysFromNow(30) },
    { title: 'Umbrella — ქოლ-ცენტრი', amount: '31000.00', stage: DealStage.LOST, probability: 0, owner: USER.loneRep, company: COMPANY.umbrella, closed: daysFromNow(-12), lostReason: 'კონკურენტმა მოიგო' },
    { title: 'Umbrella — მონაცემთა აუდიტი', amount: '5400.00', stage: DealStage.LEAD, probability: 10, owner: USER.loneRep, company: COMPANY.umbrella, expected: daysFromNow(90) },
  ];

  for (const deal of deals) {
    const created = await prisma.deal.create({
      data: {
        title: deal.title,
        amount: deal.amount,
        stage: deal.stage,
        probability: deal.probability,
        ownerId: deal.owner,
        companyId: deal.company,
        ...(deal.expected ? { expectedCloseDate: deal.expected } : {}),
        ...(deal.closed ? { closedAt: deal.closed } : {}),
        ...(deal.lostReason ? { lostReason: deal.lostReason } : {}),
      },
    });

    // ისტორიის "დაბადების" ჩანაწერი — იგივეს აკეთებს DealsService.create.
    await prisma.dealStageHistory.create({
      data: {
        dealId: created.id,
        fromStage: null,
        toStage: created.stage,
        changedById: deal.owner,
        note: 'seed-ით შექმნილი',
      },
    });
  }

  // ── აქტივობები: ვადაგადაცილებული, დაგეგმილი და შესრულებული ────────────
  const acmeDeal = await prisma.deal.findFirst({
    where: { companyId: COMPANY.acme, stage: DealStage.NEGOTIATION },
    select: { id: true },
  });

  await prisma.activity.createMany({
    data: [
      {
        type: ActivityType.CALL,
        subject: 'ფასების განხილვა CTO-სთან',
        dueAt: daysFromNow(-3), // ⚠️ ვადაგადაცილებული (completedAt = null)
        ownerId: USER.rep1,
        companyId: COMPANY.acme,
        ...(acmeDeal ? { dealId: acmeDeal.id } : {}),
      },
      {
        type: ActivityType.MEETING,
        subject: 'დემო შეხვედრა',
        dueAt: daysFromNow(2),
        ownerId: USER.rep1,
        companyId: COMPANY.acme,
      },
      {
        type: ActivityType.EMAIL,
        subject: 'კომერციული შეთავაზების გაგზავნა',
        dueAt: daysFromNow(-10),
        completedAt: daysFromNow(-9), // შესრულებული — overdue-ში არ უნდა მოხვდეს
        ownerId: USER.rep2,
        companyId: COMPANY.globex,
      },
      {
        type: ActivityType.TASK,
        subject: 'ხელშეკრულების პროექტის მომზადება',
        dueAt: daysFromNow(-1), // ვადაგადაცილებული
        ownerId: USER.rep2,
        companyId: COMPANY.globex,
      },
      {
        type: ActivityType.NOTE,
        subject: 'კლიენტი ითხოვს ეტაპობრივ დანერგვას',
        ownerId: USER.manager,
        companyId: COMPANY.initech,
      },
      {
        type: ActivityType.CALL,
        subject: 'შემდგომი ზარი',
        dueAt: daysFromNow(-7), // ვადაგადაცილებული, სხვა მფლობელით
        ownerId: USER.loneRep,
        companyId: COMPANY.umbrella,
      },
    ],
  });

  const counts = {
    მომხმარებელი: await prisma.user.count(),
    კომპანია: await prisma.company.count(),
    კონტაქტი: await prisma.contact.count(),
    გარიგება: await prisma.deal.count(),
    აქტივობა: await prisma.activity.count(),
  };

  console.log('✅ Seed დასრულდა:', counts);
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│  საცდელი მომხმარებლები (პაროლი ყველასთვის: ${PASSWORD})  │
├─────────────────────────────────────────────────────────────┤
│  admin@crm.test    ADMIN      — ხედავს ყველაფერს            │
│  manager@crm.test  MANAGER    — გუნდი: rep1 + rep2          │
│  rep1@crm.test     SALES_REP  — Acme (4 გარიგება)           │
│  rep2@crm.test     SALES_REP  — Globex (3 გარიგება)         │
│  lone@crm.test     SALES_REP  — Umbrella, მენეჯერის გარეშე  │
└─────────────────────────────────────────────────────────────┘

💡 შეამოწმე #04-ის პროგრესი: სამივე როლით შედი და შეადარე
   GET /api/v1/companies-ის შედეგები.
`);
}

main()
  .catch((error) => {
    console.error('❌ Seed ჩავარდა:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
