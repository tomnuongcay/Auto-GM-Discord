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

// Nhập ID channel
const channelIds = readline.question("Nhập ID channel (phân cách bằng dấu phẩy cho nhiều channel): ").split(',').map(id => id.trim());

// Tùy chọn xóa tin nhắn
const deleteOption = readline.question("Xóa tin nhắn sau khi gửi? (yes/no): ").toLowerCase() === 'yes';

// Nhập thời gian delay
const minDelay = parseInt(readline.question("Thời gian delay gửi tin tối thiểu (giây): ")) * 1000;
const maxDelay = parseInt(readline.question("Thời gian delay gửi tin tối đa (giây): ")) * 1000;

let waktuHapus = 0;
let waktuSetelahHapus = 0;

if (deleteOption) {
    waktuHapus = parseInt(readline.question("Thời gian delay xóa tin (giây): ")) * 1000;
    waktuSetelahHapus = parseInt(readline.question("Thời gian delay sau khi xóa (giây): ")) * 1000;
}

// Đọc token từ file
const tokens = fs.readFileSync("token.txt", "utf-8").split('\n').map(token => token.trim());

// Đọc nội dung tin nhắn từ file
let messages = [];
try {
    const messageContent = fs.readFileSync("message.txt", "utf-8").trim();
    // Chia nội dung thành các tin nhắn riêng biệt (mỗi dòng là một tin nhắn)
    messages = messageContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log(chalk.blue(`[✔] Đã đọc ${messages.length} tin nhắn từ file message.txt`));
} catch (error) {
    console.error(chalk.red("[!] Lỗi khi đọc file message.txt:", error));
    process.exit(1);
}

// Chọn chế độ gửi tin nhắn
const sendMode = readline.question("Chọn chế độ gửi tin nhắn (1 - Theo thứ tự, 2 - Ngẫu nhiên): ");

// Hàm tạo delay ngẫu nhiên
const getRandomDelay = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

// Hàm gửi tin nhắn
const sendMessage = async (channelId, token, content) => {
    try {
        const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            const messageData = await response.json();
            console.log(chalk.green(`[✔] Đã gửi "${content}" đến ${channelId}`));

            if (deleteOption) {
                await new Promise(resolve => setTimeout(resolve, waktuHapus));
                await deleteMessage(channelId, messageData.id, token);
            }
            return messageData.id;

        } else if (response.status === 429) {
            const retryAfter = (await response.json()).retry_after;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return sendMessage(channelId, token, content);
        } else {
            console.error(chalk.red(`[!] Lỗi khi gửi tin đến ${channelId}: ${response.status} ${response.statusText}`));
            const errorData = await response.json(); // Lấy chi tiết lỗi
            console.error(errorData); // Log chi tiết lỗi để debug
        }
    } catch (error) {
        console.error(chalk.red("[!] Lỗi khi gửi tin:", error));
    }
    return null;
};

// Hàm xóa tin nhắn
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
            const errorData = await delResponse.json(); // Lấy chi tiết lỗi
            console.error(errorData); // Log chi tiết lỗi để debug
        }
        await new Promise(resolve => setTimeout(resolve, waktuSetelahHapus));
    } catch (error) {
        console.error(chalk.red("[!] Lỗi khi xóa tin:", error));
    }
};

// Hàm chính
(async () => {
    while (true) {
        for (const token of tokens) {
            for (const channelId of channelIds) {
                // Tạo một bản sao của danh sách tin nhắn để tránh thay đổi danh sách gốc
                let messagesToSend = [...messages];

                // Nếu chế độ là ngẫu nhiên, xáo trộn danh sách tin nhắn
                if (sendMode === "2") {
                    messagesToSend = messagesToSend.sort(() => Math.random() - 0.5);
                }

                // Gửi từng tin nhắn
                for (const messageContent of messagesToSend) {
                    await sendMessage(channelId, token, messageContent);

                    // Thêm delay ngẫu nhiên
                    const randomDelay = getRandomDelay(minDelay, maxDelay);
                    console.log(chalk.yellow(`Đợi ${randomDelay / 1000} giây trước khi gửi tin tiếp theo...`));
                    await new Promise(resolve => setTimeout(resolve, randomDelay));
                }
            }
        }

        // Hỏi người dùng có muốn tiếp tục không
        const continueSending = readline.question("Đã gửi hết tin nhắn. Bạn có muốn tiếp tục? (yes/no): ").toLowerCase();
        if (continueSending !== 'yes') {
            console.log(chalk.blue("[✔] Dừng chương trình."));
            break;
        }
    }
})();
