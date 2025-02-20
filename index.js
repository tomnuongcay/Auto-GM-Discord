import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

cfonts.say('Tom Nuong Cay', {
    font: 'block',
    align: 'center',
    colors: ['cyan', 'magenta'],
    background: 'black',
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: '0',
});
console.log(chalk.green("=== Telegram: t.me/tomnuongcay ==="));

const channelIds = readline.question("Nhập ID channel (phân cách bằng dấu phẩy cho nhiều channel): ").split(',').map(id => id.trim());
const deleteOption = readline.question("Xóa tin nhắn sau khi gửi? (yes/no): ").toLowerCase() === 'có';
const minDelay = parseInt(readline.question("Thời gian delay gửi tin tối thiểu (giây): ")) * 1000;
const maxDelay = parseInt(readline.question("Thời gian delay gửi tin tối đa (giây): ")) * 1000;

let waktuHapus = 0;
let waktuSetelahHapus = 0;

if (deleteOption) {
    waktuHapus = parseInt(readline.question("Thời gian delay xóa tin (giây): ")) * 1000;
    waktuSetelahHapus = parseInt(readline.question("Thời gian delay sau khi xóa (giây): ")) * 1000;
}

const tokens = fs.readFileSync("token.txt", "utf-8").split('\n').map(token => token.trim());

const MESSAGE_CONTENT = "gm"; // Hardcode nội dung tin nhắn

const getRandomDelay = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

const sendMessage = async (channelId, token) => {
    try {
        const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: MESSAGE_CONTENT })
        });

        if (response.ok) {
            const messageData = await response.json();
            console.log(chalk.green(`[✔] Đã gửi "${MESSAGE_CONTENT}" đến ${channelId}`));

            if (deleteOption) {
                await new Promise(resolve => setTimeout(resolve, waktuHapus));
                await deleteMessage(channelId, messageData.id, token);
            }
            return messageData.id;

        } else if (response.status === 429) {
            const retryAfter = (await response.json()).retry_after;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return sendMessage(channelId, token);
        } else {
            console.error(chalk.red(`[!] Lỗi khi gửi tin đến ${channelId}: ${response.status} ${response.statusText}`));
            const errorData = await response.json(); // Get error details
            console.error(errorData); // Log error details for debugging
        }
    } catch (error) {
        console.error(chalk.red("[!] Lỗi khi gửi tin:", error));
    }
    return null;
};

const deleteMessage = async (channelId, messageId, token) => {
    try {
        const delResponse = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        if (delResponse.ok) {
            console.log(chalk.blue(`[✔] Đã xóa tin ${messageId} trong ${channelId}`));
        } else {
            console.error(chalk.red(`[!] Lỗi khi xóa tin ${messageId} trong ${channelId}: ${delResponse.status} ${delResponse.statusText}`));
            const errorData = await delResponse.json(); // Get error details
            console.error(errorData); // Log error details for debugging
        }
        await new Promise(resolve => setTimeout(resolve, waktuSetelahHapus));
    } catch (error) {
        console.error(chalk.red("[!] Lỗi khi xóa tin:", error));
    }
};

(async () => {
    while (true) {
        for (const token of tokens) {
            for (const channelId of channelIds) {
                await sendMessage(channelId, token);
                const randomDelay = getRandomDelay(minDelay, maxDelay);
                console.log(chalk.yellow(`Đợi ${randomDelay / 1000} giây trước khi gửi tin tiếp theo...`));
                await new Promise(resolve => setTimeout(resolve, randomDelay));
            }
        }
    }
})();
