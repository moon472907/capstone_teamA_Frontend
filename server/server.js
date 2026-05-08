const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// public 폴더 정적 서빙
app.use("/assets", express.static(path.join(__dirname, "../public/assets")));

// client 폴더 정적 서빙
app.use(express.static(path.join(__dirname, "../client")));

// 메인 진입점
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
