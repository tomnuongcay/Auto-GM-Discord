import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

cfonts.say('TOM NUONG CAY', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'magenta'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== Telegram: Tôm Nướng Cay ( @tomnuongcay ) ==="));

const channelIds = readline.question("Nhập ID channel (phân cách bằng dấu phẩy cho nhiều channel): ").split(',').map(id => id.trim());
const deleteOption = readline.question("Xóa tin nhắn sau khi gửi? (y/n): ").toLowerCase() === 'có';
const waktuKirim = parseInt(readline.question("Thời gian delay gửi tin (giây): ")) * 1000;
let waktuHapus = 0;
let waktuSetelahHapus = 0;

if (deleteOption) {
    waktuHapus = parseInt(readline.question("Thời gian delay xóa tin (giây): ")) * 1000;
    waktuSetelahHapus = parseInt(readline.question("Thời gian delay sau khi xóa (giây): ")) * 1000;
}

const tokens = fs.readFileSync("token.txt", "utf-8").split('\n').map(token => token.trim());

// ========= PHẦN ĐÃ SỬA =========
const MESSAGE_CONTENT = "gm"; // Hardcode nội dung tin nhắn

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
        }
    } catch (error) {
        console.error(chalk.red("[!] Lỗi khi gửi tin"));
    }
    return null;
};
// ================================

const deleteMessage = async (channelId, messageId, token) => {
    try {
        const delResponse = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        if (delResponse.ok) {
            console.log(chalk.blue(`[✔] Đã xóa tin ${messageId} trong ${channelId}`));
        }
        await new Promise(resolve => setTimeout(resolve, waktuSetelahHapus));
    } catch (error) {
        console.error(chalk.red("[!] Lỗi khi xóa tin"));
    }
};

(async () => {
    while (true) {
        for (const token of tokens) {
            for (const channelId of channelIds) {
                await sendMessage(channelId, token);
                await new Promise(resolve => setTimeout(resolve, waktuKirim));
            }
        }
    }
})();