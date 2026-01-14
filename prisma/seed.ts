import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

const prisma = new PrismaClient({ adapter });


async function main() {
    const roles = [
        { name: 'USER', weight: 10 },
        { name: 'MODERATOR', weight: 50 },
        { name: 'ADMIN', weight: 100 }
    ]

    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: { weight: role.weight },
            create: role,
        })
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })