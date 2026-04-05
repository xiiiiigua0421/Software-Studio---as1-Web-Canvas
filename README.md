# Software Studio 2026 Spring
## Assignment 01 Web Canvas

### Scoring

| **Basic components** | **Score** | **Check** |
| :------------------- | :-------: | :-------: |
| Basic control tools  |    20%    |     Y     |
| Text input           |    10%    |     Y     |
| Cursor icon          |    5%     |     Y     |
| Refresh button       |    5%     |     Y     |

| **Advanced tools** | **Score** | **Check** |
| :--------------------- | :-------: | :-------: |
| Different brush shapes |    15%    |     Y     |
| Image tool             |    5%     |     Y     |
| Download               |    5%     |     Y     |
| Layer Management       |    10%    |     Y     |

| **Other useful widgets** | **Score** | **Check** |
| :----------------------- | :-------: | :-------: |
| Scanline Bucket Tool     |   0~10%   |     Y     |
| Advanced Color Picker    |   0~10%   |     Y     |
| Eyedropper Tool          |   0~10%   |     Y     |
| Canvas Resize / Rotate   |   0~10%   |     Y     |

---

### How to use 

介面分為三大區塊：

* **左側工具列 (Tools Panel):**
    * **繪圖工具**: 提供安全游標 (防止誤觸)、畫筆、橡皮擦。
    * **形狀工具**: 矩形、圓形、三角形。**操作秘訣：** 繪製時按住 `Ctrl` 鍵即可鎖定為正方形、正圓形或正三角形。
    * **進階工具**: 包含圖片匯入、吸管工具 (跨圖層吸色) 與油漆桶。
        * 匯入圖片後生成可拖曳、縮放 (按 `Ctrl` 等比例) 的 DOM Overlay，確認後才寫入圖層
    * **調色盤與筆刷大小**: 支援直覺的 HSV 色塊選取，或透過 RGB 滑桿精準調色；筆刷大小調整時會即時連動畫布上的「自訂游標預覽環」。
* **頂部控制列 (Top Bar):**
    * 可自訂畫布解析度 (Width/Height) 並點擊 `Resize` 重新縮放。
    * `↻ Rotate` 可將全圖層順時針旋轉 90 度。
    * `Refresh🔄` 一鍵清空當前圖層，`Download⬇️` 則會合併所有可見圖層並自動補底色後匯出 PNG。
* **右側面板 (Right Panel):**
    * **Layers**: 提供多圖層管理，點擊圖層區塊可切換當前作畫層，點擊 `👁️/🙈` 切換可見度，或使用垃圾桶圖示單獨清空該層。每個圖層皆擁有**獨立的 50 步 Undo/Redo 歷史紀錄**。
    * **Text Settings**: 使用文字工具前，可在此設定字型與大小，隨後點擊畫布即可輸入。

### Bonus Function description

本專案實作多項進階圖學功能與效能最佳化：

1. **Scanline Flood Fill (油漆桶工具) 🪣**: 實作掃描線種子填充演算法，直接操作 `ImageData`，解決傳統 DFS 遞迴易造成的 Stack Overflow，大面積填色依然順暢。
2. **Dynamic Calligraphy Brush (動態書法畫筆) 🖌️**: 透過計算滑鼠移動速度 ($v = d/dt$) 動態改變畫筆寬度，並配合平滑過渡演算法，模擬真實毛筆運筆質感。
3. **Eyedropper Tool (吸管工具) 💉**: 支援跨圖層吸色，由頂層向下穿透檢查，精準擷取非透明像素 RGB 數值並即時連動調色盤 UI。
4. **Canvas Resizer (畫布縮放) 📐**: 允許自訂畫布 W/H 解析度，並搭配 Off-screen Canvas 暫存技術，確保縮放後不遺失既有圖層內容。
    * Off-screen Canvas Rendering (隱形畫布渲染): 在背景靜默處理圖層合併與畫布變形，避免重繪時畫面閃爍或遺失歷史狀態。
5. **Canvas Rotation (畫布旋轉) ↻**: 運用 `translate` 與 `rotate` 矩陣運算，一鍵將所有圖層內容順時針旋轉 90 度。

### Web page link

    https://github.com/xiiiiigua0421/Software-Studio---as1-Web-Canvas

### Others (Optional)

**粉彩夢幻主題**: 粉紫、珍珠水綠、海藍寶、杏奶油、沙褐柔和地疊加在背景上，同時半透明毛玻璃般的側邊欄及畫布透出水綠色的陰影，發光的按鈕及顏色漸變的工具選項，帶來初春般清新的氣息

架構設計上盡力貼近專業繪圖軟體的解耦思維，希望能帶來順暢的操作體驗！

<style>
table th{
    width: 100%;
}
</style>