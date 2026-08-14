// ============================================================================
// GAME CONFIG — file cấu hình cân bằng game, sửa xong lưu lại là áp dụng ngay
// (Vite tự hot-reload). Đây là các con số/hằng số điều khiển hành vi thật của
// game — không phải chỉ là tài liệu mô tả. Sửa số ở đây thay vì đi tìm trong
// App.tsx. Đối chiếu ý nghĩa từng mục với GAME_SETTINGS_REFERENCE.md.
//
// LƯU Ý: đây chỉ là các HẰNG SỐ (con số). Cấu trúc thuật toán (thứ tự tính,
// công thức) vẫn nằm trong App.tsx — sửa file này không đổi được LOGIC, chỉ
// đổi được CON SỐ dùng trong logic đó.
// ============================================================================

export const GAME_CONFIG = {

    // 1. CHỈ SỐ KHỞI ĐIỂM CHO NHÂN VẬT MỚI (INITIAL_STATS)
    startingStats: {
        ap: 5,
        baseHp: 2000,
        baseAtk: 200,
        baseDef: 100,
        baseSpd: 300,
        baseCr: 15,       // % tỉ lệ chí mạng gốc
        baseCdmg: 200,   // % sát thương chí mạng gốc (150 = x1.5)
        baseDmgAmp: 100,
        baseDmgRes: 100,
        baseEvasion: 100,
    },

    // 2. QUY ĐỔI 1 ĐIỂM AP THÀNH CHỈ SỐ KHI NGƯỜI CHƠI TỰ PHÂN BỔ
    apConversionRates: {
        hp: 200,   // 1 AP = +20 HP
        atk: 10,   // 1 AP = +1 ATK
        def: 10,   // 1 AP = +1 DEF
        spd: 10,   // 1 AP = +1 SPD
    },

    // 3. CÔNG THỨC EXP CẦN ĐỂ LÊN CẤP TIẾP THEO
    //    maxExp = base * (level ^ levelExponent) * (realmMultiplier ^ realmIndex)
    //    realmIndex = floor((level - 1) / 10)
    expFormula: {
        base: 100,
        levelExponent: 1.5,
        realmMultiplier: 1.8,
    },

    // 4. CÔNG THỨC SỐ ĐIỂM AP NHẬN ĐƯỢC MỖI KHI LÊN CẤP
    //    AP mỗi cấp = base + (perRealmBonus * realmIndex)
    //    Mỗi lần đột phá cảnh giới (mỗi 10 cấp) được cộng thêm 1 lần: breakthroughBonusUnit * lần_đột_phá_thứ_mấy
    apPerLevel: {
        base: 5,
        perRealmBonus: 3,
        breakthroughBonusUnit: 10,
    },

    // 5. CÔNG THỨC SÁT THƯƠNG
    damageFormula: {
        critRateCapPercent: 100,      // Trần tỉ lệ chí mạng — vượt quá sẽ đổi thành CDMG
        critOverflowToCdmgDivisor: 2, // Cứ dư 2% CR vượt trần = +1 CDMG
        defenseBaseK: 30,             // K_DEFENSE = defenseBaseK + defensePerLevelK * (level - 1)
        defensePerLevelK: 4,          // DEF càng cao thì giảm sát thương càng nhiều, nhưng K tăng theo level mục tiêu để DEF không bị lạm phát
    },

    // 6. HỆ SỐ GIÁ MUA/BÁN THEO ĐỘ KHÓ
    difficultyMultipliers: {
        'Dễ':           { sell: 0.9, buy: 1.0 },
        'Thường':       { sell: 0.7, buy: 1.3 },
        'Khó':          { sell: 0.5, buy: 1.8 },
        'Ác Mộng':      { sell: 0.3, buy: 2.5 },
        'Tuỳ Chỉnh AI': { sell: 0.3, buy: 1.3 },
    },

    // 7. ĐỘ NGẪU NHIÊN CỦA "NGÂN SÁCH" VẬT PHẨM THEO ĐỘ KHÓ, dạng [min, max]
    difficultyRandomness: {
        'Dễ':           [99999, 99999],
        'Thường':       [99999, 99999],
        'Khó':          [99999, 99999],
        'Ác Mộng':      [99999, 99999],
        'Tuỳ Chỉnh AI': [99999, 99999],
    },

    // 8. GIÁ TRỊ GỐC (Value) THEO ĐỘ HIẾM — dùng cho cả ngân sách vật phẩm lẫn
    //    ngưỡng quy đổi độ hiếm khi dung hợp (Lò Vạn Vật)
    rarityBaseValue: {
        'Thường': 100,
        'Tốt': 300,
        'Hiếm': 1000,
        'Cực Phẩm': 2000,
        'Siêu Phẩm': 4000,
        'Huyền Thoại': 10000,
        'Thần Thoại': 100000, // Phẩm đặc biệt cực kỳ mạnh — ngân sách gấp 10 lần Huyền Thoại
    },

    // 9. HỆ SỐ NHÂN GIÁ TRỊ THEO LOẠI VẬT PHẨM (category)
    itemTypeMultiplier: {
        'Vũ khí': 1.0, 'Thân': 1.0, 'Đầu': 1.0, 'Chân': 1.0, 'Phụ kiện': 1.1,
        'Trữ vật': 1.0, 'Dị thường': 1.5, 'Phương tiện': 1.2,
        'Đan dược': 0.15, 'Thực phẩm': 0.15, 'Đa năng': 0.2,
        'Nguyên liệu': 0.1, 'Tạp vật': 0.05, 'Tín vật': 0.3,
        'Sách kỹ năng': 2.0,
    },

    // 10. DUNG HỢP / CHẾ TẠO (tính năng "Lò Vạn Vật")
    fusion: {
        costRate: 0.1,             // Chi phí dung hợp = 10% tổng giá trị nguyên liệu
        valueDivisor: 0.5,         // Giá trị vật phẩm ra lò = tổng giá trị nguyên liệu / 0.5
        breakthroughChance: 1,  // 8% cơ hội vật phẩm ra lò được +1 bậc hiếm
    },

    // 11. TỈ LỆ RƠI ĐỘ HIẾM VẬT PHẨM THEO KHOẢNG LEVEL (mỗi dòng nên cộng lại = 100)
    // "Thần Thoại" là phẩm chất cao nhất, cao hơn "Huyền Thoại" — cực kỳ hiếm, chỉ bắt đầu
    // có cơ hội rơi ra từ level 21 trở đi, tăng dần theo level. Mỗi dòng cộng lại vẫn = 100.
    rarityDistributionByLevel: {
        '1-10':   { 'Thường': 40, 'Tốt': 30, 'Hiếm': 20, 'Cực Phẩm': 6,  'Siêu Phẩm': 3,  'Huyền Thoại': 1, 'Thần Thoại': 0 },
        '11-20':  { 'Thường': 30, 'Tốt': 30, 'Hiếm': 23, 'Cực Phẩm': 10, 'Siêu Phẩm': 5,  'Huyền Thoại': 2, 'Thần Thoại': 0 },
        '21-30':  { 'Thường': 20, 'Tốt': 30, 'Hiếm': 28, 'Cực Phẩm': 14, 'Siêu Phẩm': 6,  'Huyền Thoại': 1, 'Thần Thoại': 1 },
        '31-40':  { 'Thường': 10, 'Tốt': 25, 'Hiếm': 32, 'Cực Phẩm': 22, 'Siêu Phẩm': 8,  'Huyền Thoại': 2, 'Thần Thoại': 1 },
        '41-50':  { 'Thường': 5,  'Tốt': 20, 'Hiếm': 35, 'Cực Phẩm': 25, 'Siêu Phẩm': 11, 'Huyền Thoại': 3, 'Thần Thoại': 1 },
        '51+':    { 'Thường': 1,  'Tốt': 15, 'Hiếm': 35, 'Cực Phẩm': 25, 'Siêu Phẩm': 17, 'Huyền Thoại': 5, 'Thần Thoại': 2 },
    },

    // 12. GIỚI HẠN SỐ LƯỢT HỒI CHIÊU TỐI ĐA CHO 1 KỸ NĂNG COMBAT
    skillCooldownMax: 0,

    // 13. KHOẢNG CÁCH TỐI THIỂU (mili-giây) GIỮA 2 LẦN GỌI GEMINI API LIÊN TIẾP.
    //     Bắt buộc phải >= (60000 / RPM giới hạn thật của tài khoản bạn), xem tại
    //     aistudio.google.com > Rate Limit. Free tier "Gemini 3 Flash" hiện chỉ cho 5 RPM
    //     => tối thiểu 12000ms/request. Để 13000 cho có biên an toàn.
    //     Nếu sau này nâng cấp tài khoản trả phí (RPM cao hơn), giảm số này để game chạy nhanh hơn.
    apiQueueDelayMs: 13000,

    // 14. EXP KỸ NĂNG — Ngưỡng EXP cần để 1 kỹ năng tự động tăng 1 bậc phẩm chất.
    //     Giá trị = rarityBaseValue[bậc] * 2. Chỉnh riêng từng bậc thoải mái mà không ảnh hưởng bậc khác.
    //     "Thần Thoại" là bậc tối đa — không dùng ngưỡng này, kỹ năng khoá EXP khi đạt bậc này.
    skillExpToNextRarity: {
        'Thường': 200,
        'Tốt': 600,
        'Hiếm': 2000,
        'Cực Phẩm': 4000,
        'Siêu Phẩm': 8000,
        'Huyền Thoại': 20000,
        'Thần Thoại': null,
    },

    // 15. LƯỢNG EXP KỸ NĂNG NHẬN ĐƯỢC MỖI LẦN "DÙNG"
    skillExpPerUse: 10,              // Kỹ năng chiến đấu: mỗi lần tung chiêu trong trận.
    skillExpPerAdventureTrigger: 10, // Kỹ năng phiêu lưu: mỗi lần sự kiện liên quan xảy ra (bán/mua/chế tạo/rớt đồ/qua lượt...).
};
