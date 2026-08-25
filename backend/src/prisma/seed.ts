import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ Starting ELECTROBIT database seeding...');

  // 1. Admin setup
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'electrobit2026';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';

  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { password: hashedPassword },
    create: {
      username: adminUsername,
      password: hashedPassword,
    },
  });
  console.log(`✅ Admin account created: ${adminUsername}`);

  // 2. Event Settings
  await prisma.eventSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      eventName: 'ELECTROBIT',
      eventSubtitle: 'THE EEE AUCTION CHALLENGE',
      eventStatus: 'NOT_STARTED',
      startingPoints: 10000,
      minBidIncrement: 100,
      biddingTimerDefault: 30,
      answerTimerDefault: 30,
    },
  });
  console.log('✅ Event settings initialized.');

  // 3. Sample Teams
  const sampleTeams = [
    {
      registrationNumber: 'EBIT-1001',
      teamName: 'Circuit Kings',
      participant1Name: 'Arjun Sharma',
      participant2Name: 'Siddharth Rao',
      collegeName: 'MIT Institute of Technology',
      department: 'Electrical & Electronics Engineering',
      phone: '9876543210',
      email: 'arjun.ck@college.edu',
      points: 10000,
      status: 'ACTIVE',
    },
    {
      registrationNumber: 'EBIT-1002',
      teamName: 'Power Warriors',
      participant1Name: 'Kavya Nair',
      participant2Name: 'Rohan Gupta',
      collegeName: 'National College of Engineering',
      department: 'Electrical & Electronics Engineering',
      phone: '9876543211',
      email: 'kavya.pw@college.edu',
      points: 10000,
      status: 'ACTIVE',
    },
    {
      registrationNumber: 'EBIT-1003',
      teamName: 'Electron Squad',
      participant1Name: 'Vikram Sundaram',
      participant2Name: 'Priya Venkatesh',
      collegeName: 'College of Engineering & Technology',
      department: 'Electrical & Electronics Engineering',
      phone: '9876543212',
      email: 'vikram.es@college.edu',
      points: 10000,
      status: 'ACTIVE',
    },
    {
      registrationNumber: 'EBIT-1004',
      teamName: 'Voltage Masters',
      participant1Name: 'Ananya Reddy',
      participant2Name: 'Karan Malhotra',
      collegeName: 'Apex Institute of Science & Tech',
      department: 'Electrical & Electronics Engineering',
      phone: '9876543213',
      email: 'ananya.vm@college.edu',
      points: 10000,
      status: 'ACTIVE',
    },
    {
      registrationNumber: 'EBIT-1005',
      teamName: 'Ohm Force',
      participant1Name: 'Devansh Verma',
      participant2Name: 'Sneha Patel',
      collegeName: 'Global Technology University',
      department: 'Electrical & Electronics Engineering',
      phone: '9876543214',
      email: 'devansh.of@college.edu',
      points: 10000,
      status: 'ACTIVE',
    },
  ];

  for (const team of sampleTeams) {
    await prisma.team.upsert({
      where: { registrationNumber: team.registrationNumber },
      update: { points: 10000 },
      create: team,
    });
  }
  console.log(`✅ ${sampleTeams.length} sample teams seeded.`);

  // 4. Sample EEE Questions (20 questions across Easy, Medium, Hard, Super Challenge)
  const sampleQuestions = [
    // EASY (100 Points)
    {
      questionText: 'What parameter remains constant in an ideal transformer from primary to secondary side?',
      correctAnswer: 'Power / Frequency',
      difficulty: 'EASY',
      basePoints: 100,
      timeLimit: 30,
      category: 'Electrical Machines',
    },
    {
      questionText: 'Which theorem states that any linear bilateral circuit can be replaced by a single voltage source in series with an equivalent resistance?',
      correctAnswer: "Thevenin's Theorem",
      difficulty: 'EASY',
      basePoints: 100,
      timeLimit: 30,
      category: 'Circuit Theory',
    },
    {
      questionText: 'What is the SI unit of magnetic flux density?',
      correctAnswer: 'Tesla (T) or Weber/m²',
      difficulty: 'EASY',
      basePoints: 100,
      timeLimit: 30,
      category: 'Electromagnetics',
    },
    {
      questionText: 'In a 3-phase star connected system, what is the relationship between line voltage and phase voltage?',
      correctAnswer: 'Line Voltage = √3 × Phase Voltage',
      difficulty: 'EASY',
      basePoints: 100,
      timeLimit: 30,
      category: 'Power Systems',
    },
    {
      questionText: 'What type of semiconductor material is created by doping pure silicon with trivalent impurities like boron?',
      correctAnswer: 'P-type semiconductor',
      difficulty: 'EASY',
      basePoints: 100,
      timeLimit: 30,
      category: 'Analog Electronics',
    },

    // MEDIUM (300 Points)
    {
      questionText: 'What is the maximum power transfer efficiency of a linear circuit according to the Maximum Power Transfer Theorem?',
      correctAnswer: '50%',
      difficulty: 'MEDIUM',
      basePoints: 300,
      timeLimit: 30,
      category: 'Circuit Theory',
    },
    {
      questionText: 'In a 3-phase induction motor, if synchronous speed is 1500 RPM and rotor speed is 1440 RPM, calculate the percentage slip.',
      correctAnswer: '4% (Slip = (1500 - 1440)/1500 * 100)',
      difficulty: 'MEDIUM',
      basePoints: 300,
      timeLimit: 30,
      category: 'Electrical Machines',
    },
    {
      questionText: 'Which power semiconductor device combines the simple gate-drive characteristics of MOSFETs with the high-current and low-saturation-voltage capability of bipolar transistors?',
      correctAnswer: 'IGBT (Insulated Gate Bipolar Transistor)',
      difficulty: 'MEDIUM',
      basePoints: 300,
      timeLimit: 30,
      category: 'Power Electronics',
    },
    {
      questionText: 'What causes Ferranti Effect in long transmission lines under light load or no-load conditions?',
      correctAnswer: 'Line Capacitance / Charging Current',
      difficulty: 'MEDIUM',
      basePoints: 300,
      timeLimit: 30,
      category: 'Power Systems',
    },
    {
      questionText: 'What is the open-loop gain requirement for sustained oscillations according to Barkhausen Criterion?',
      correctAnswer: '|Aβ| = 1 and total phase shift = 0° or 360°',
      difficulty: 'MEDIUM',
      basePoints: 300,
      timeLimit: 30,
      category: 'Analog Electronics',
    },

    // HARD (500 Points)
    {
      questionText: 'In a DC machine, what is the purpose of compensating windings placed in the pole shoes?',
      correctAnswer: 'To neutralize armature reaction in the interpole zone and prevent sparking/flashover under heavy surge loads.',
      difficulty: 'HARD',
      basePoints: 500,
      timeLimit: 30,
      category: 'Electrical Machines',
    },
    {
      questionText: 'What is the mathematical condition for a second-order feedback control system to exhibit critically damped response?',
      correctAnswer: 'Damping ratio ζ (zeta) = 1',
      difficulty: 'HARD',
      basePoints: 500,
      timeLimit: 30,
      category: 'Control Systems',
    },
    {
      questionText: 'Calculate the total number of SCRs required in a 3-phase fully-controlled bridge converter (6-pulse converter).',
      correctAnswer: '6 Thyristors / SCRs',
      difficulty: 'HARD',
      basePoints: 500,
      timeLimit: 30,
      category: 'Power Electronics',
    },
    {
      questionText: 'What is the main function of Buchholz Relay in a power transformer and where is it installed?',
      correctAnswer: 'Gas-actuated protective relay for internal faults, installed in the pipe connecting main tank and conservator tank.',
      difficulty: 'HARD',
      basePoints: 500,
      timeLimit: 30,
      category: 'Power Systems',
    },
    {
      questionText: 'In a Synchronous Generator connected to infinite bus, what happens to power angle δ (delta) when mechanical input power is increased while excitation is constant?',
      correctAnswer: 'Power angle δ increases, delivering more active real power to the grid.',
      difficulty: 'HARD',
      basePoints: 500,
      timeLimit: 30,
      category: 'Power Systems',
    },

    // SUPER CHALLENGE (1000 Points)
    {
      questionText: '⚡ SUPER CHALLENGE: Derive the steady-state torque expression of a 3-phase Induction Motor. At what value of slip s is maximum torque (breakdown torque) developed?',
      correctAnswer: 's_max = R2 / X2 (Rotor resistance divided by rotor standstill reactance)',
      difficulty: 'SUPER_CHALLENGE',
      basePoints: 1000,
      timeLimit: 30,
      category: 'Electrical Machines',
    },
    {
      questionText: '⚡ SUPER CHALLENGE: Explain the phenomenon of "Subsynchronous Resonance" (SSR) in series capacitor compensated EHV transmission lines and its severe mechanical impact on turbine-generator shafts.',
      correctAnswer: 'Electrical resonance between series capacitor and line inductance at a frequency sub-harmonic to grid frequency, causing torsional oscillations and shaft fatigue/fracture.',
      difficulty: 'SUPER_CHALLENGE',
      basePoints: 1000,
      timeLimit: 30,
      category: 'Power Systems',
    },
    {
      questionText: '⚡ SUPER CHALLENGE: In Space Vector Pulse Width Modulation (SVPWM) for 3-phase voltage source inverters, how many active voltage vectors and zero vectors exist in the hexagonal state space?',
      correctAnswer: '6 Active Vectors (V1-V6) and 2 Zero Vectors (V0, V7)',
      difficulty: 'SUPER_CHALLENGE',
      basePoints: 1000,
      timeLimit: 30,
      category: 'Power Electronics & Drives',
    },
    {
      questionText: '⚡ SUPER CHALLENGE: For a control system with open loop transfer function G(s)H(s) = K / [s(s+2)(s+4)], determine the exact value of gain K that makes the closed loop system marginally stable.',
      correctAnswer: 'K = 48 (Routh-Hurwitz array row of s^1 yields 8*6 - K = 0 => K = 48)',
      difficulty: 'SUPER_CHALLENGE',
      basePoints: 1000,
      timeLimit: 30,
      category: 'Control Systems',
    },
    {
      questionText: '⚡ SUPER CHALLENGE: In HVDC transmission using Line Commutated Converters (LCC), what causes "Commutation Failure" in the inverter bridge during AC system voltage dips?',
      correctAnswer: 'Extinction angle γ (gamma) falling below minimum required de-ionization time of thyristors due to reduced AC voltage or excessive DC current.',
      difficulty: 'SUPER_CHALLENGE',
      basePoints: 1000,
      timeLimit: 30,
      category: 'HVDC & Power Systems',
    },
  ];

  const existingQuestionsCount = await prisma.question.count();
  if (existingQuestionsCount === 0) {
    for (const q of sampleQuestions) {
      await prisma.question.create({
        data: q,
      });
    }
    console.log(`✅ ${sampleQuestions.length} sample EEE questions seeded.`);
  } else {
    console.log(`ℹ️ Questions already seeded (${existingQuestionsCount} questions in DB).`);
  }
  console.log('⚡ ELECTROBIT database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
