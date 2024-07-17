import { Bot, Context, GrammyError, HttpError } from 'grammy';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Alchemy, BigNumber, Network } from 'alchemy-sdk';
import { isAddress } from 'web3-validator';

const token = process.env.TOKEN;
const apiKey = process.env.APIKEY;
if (!token) throw new Error('TOKEN must be provided!');

const bot = new Bot(token);

const config = {
    apiKey: apiKey,
    network: Network.BASE_MAINNET,
};
const alchemy = new Alchemy(config);

const INTERVAL_MS = 10 * 60 * 1000;


const intervals: { [key: string]: NodeJS.Timeout | null } = {};



async function makeApiRequest(ctx: Context, address: string, value: string, key: string) {
    try {

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const key = `${ctx.chat?.id}-${ctx.from?.id}-${address}-${value}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await alchemy.core.getBalance(address);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const balance: any = response / 1e18;
        
        const numValue = Number(value);
        
        if (balance < numValue) {

            await ctx.reply(` 🔴 The address ${address} funds have been decreased under ${numValue} Ether. 
Current balance of the ${address} is: ${balance} Ether`);

        }


    } catch (error) {

        if (intervals[key]) {
            clearInterval(intervals[key] as NodeJS.Timeout);
            intervals[key] = null;
        }

        throw new Error(`API request failed with status ${error}`);
    }
}

function isValidFormat(input: string): boolean {
    const regex = /^\d+\.\d{2}$/;
    return regex.test(input);
}
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error:  ${err.message}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        ctx.reply(`${err.error}: ${err.message}`);
        console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
        ctx.reply(`${err.error}: ${err.message}`);
        ctx.reply(`Error whilessss  ${e}:`);
    } else {
        ctx.reply(`${err.error}`);

    }
});

bot.api.setMyCommands([
    { command: 'start', description: 'Start the balance track e.g:/start <address> value' },
    { command: 'stop', description: 'Start the track address and value e.g:/stop <address> value' },
    { command: 'list', description: 'Start the track address and value e.g:/stop <address> value' },

]);

bot.command('start', async (ctx) => {
    const args = ctx.match?.split(' ') || [];

    if (args.length < 2) {
        throw new Error('🔴 Please provide the address and value.');
    }

    const address = args[0].trim();
    const value = args[1].trim();

    if (!isAddress(address)) {
        throw new Error('🔴 Please enter a valid etherium address');
    }

    if (!isValidFormat(value)) {
        throw new Error('🔴 Please enter a valid format e.g. 1.34');
    }

    const key = `${ctx.chat?.id}-${ctx.from?.id}-${address}-${value}`;


    if (intervals[key]) {
        throw new Error('🔴 Bot is already working in this chat for this address and value.');
    }


    await ctx.reply(`✅ Staring to follow ${address} for the down limit of ${value} Ether  
    🔴 You can stop tracking by saying /stop ${address} ${value}`);




    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (intervals[key] as any) = setInterval(async () => {
        await makeApiRequest(ctx, address, value, key);
    }, INTERVAL_MS);
});

bot.command('stop', async (ctx) => {
    const args = ctx.match?.split(' ') || [];

    if (args.length < 2) {
        throw new Error('🔴 Please provide the adress and value.');
        return;
    }

    const address = args[0];
    const value = args[1];

    if (!isAddress(address)) {
        throw new Error('🔴 Please enter a valid etherium address');
    }

    if (!isValidFormat(value)) {
        throw new Error('🔴 Please enter a valid format e.g. 1.34');
    }

    const key = `${ctx.chat?.id}-${ctx.from?.id}-${address}-${value}`;

    if (intervals[key]) {
        clearInterval(intervals[key] as NodeJS.Timeout);
        intervals[key] = null;
        await ctx.reply(`Bot unfollowed ${address}`);
    } else {
        await ctx.reply(`We do not keep track of such ${address} and ${value}. Could not finalize`);
    }
});

bot.command('list', async (ctx) => {
    if (Object.keys(intervals).length === 0) {
        await ctx.reply('🔴 No active tracking intervals.');
        return;
    }

    let message = '📜 Active tracking intervals:\n';
    for (const key of Object.keys(intervals)) {
        message += `- ${key}\n`;
    }
    await ctx.reply(message);
});


bot.start();
