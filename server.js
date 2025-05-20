// Import các thư viện cần thiết
const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

// Khởi tạo ứng dụng Express
const app = express();
const port = 3000;

// Phục vụ các file tĩnh từ thư mục public
app.use(express.static('public'));

// Khởi tạo provider để kết nối với mạng BASE Mainnet thông qua Alchemy
const provider = new ethers.AlchemyProvider(
  'base', // Tên mạng
  process.env.ALCHEMY_API_KEY // API key từ file .env
);

// ABI tối thiểu để đọc thông tin NFT
const minimalABI = [
  // Hàm balanceOf - kiểm tra số lượng NFT của một địa chỉ
  "function balanceOf(address owner) view returns (uint256)",
  // Hàm tokenOfOwnerByIndex - lấy token ID theo index
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  // Hàm tokenURI - lấy metadata URI của token
  "function tokenURI(uint256 tokenId) view returns (string)"
];

// Khởi tạo contract instance
const nftContract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  minimalABI,
  provider
);

// API endpoint để lấy danh sách NFT của một địa chỉ ví
app.get('/api/nfts/:address', async (req, res) => {
  try {
    const walletAddress = req.params.address;

    // Kiểm tra địa chỉ ví có hợp lệ không
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Địa chỉ ví không hợp lệ' });
    }

    // Lấy số lượng NFT của địa chỉ ví
    const balance = await nftContract.balanceOf(walletAddress);
    const tokenCount = Number(balance);

    if (tokenCount === 0) {
      return res.json({ tokens: [] });
    }

    // Lấy thông tin của từng NFT
    const tokens = [];
    for (let i = 0; i < tokenCount; i++) {
      // Lấy token ID
      const tokenId = await nftContract.tokenOfOwnerByIndex(walletAddress, i);
      
      // Lấy metadata URI
      const tokenUri = await nftContract.tokenURI(tokenId);

      // Lấy metadata từ URI
      const response = await fetch(tokenUri);
      const metadata = await response.json();

      tokens.push({
        tokenId: tokenId.toString(),
        name: metadata.name,
        description: metadata.description,
        image: metadata.image
      });
    }

    res.json({ tokens });
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi lấy thông tin NFT' });
  }
});

// Khởi động server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});