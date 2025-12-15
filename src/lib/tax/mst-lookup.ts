// src/lib/tax/mst-lookup.ts
// Tra cứu Mã số thuế - Tax Code Lookup Service

interface MSTLookupResult {
    success: boolean;
    data?: {
        taxCode: string;
        name: string;
        shortName?: string;
        address?: string;
    };
    error?: string;
    source: 'VIETQR' | 'CACHE' | 'MANUAL';
}

interface PartnerValidation {
    isValid: boolean;
    taxCodeStatus: 'ACTIVE' | 'UNKNOWN' | 'INVALID';
    nameMatch: boolean;
    nameMatchScore?: number;
    registeredName?: string;
    message?: string;
}

/**
 * Tra cứu MST từ VietQR API (Free)
 * @param taxCode - Mã số thuế (10 hoặc 13 số)
 */
export async function lookupTaxCode(taxCode: string): Promise<MSTLookupResult> {
    // Validate format
    if (!isValidTaxCodeFormat(taxCode)) {
        return {
            success: false,
            error: 'Định dạng MST không hợp lệ (cần 10 hoặc 13 số)',
            source: 'MANUAL'
        };
    }

    try {
        // Call VietQR API
        const response = await fetch(`https://api.vietqr.io/v2/business/${taxCode}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            // Timeout 10s
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            if (response.status === 404) {
                return {
                    success: false,
                    error: 'Không tìm thấy MST trong hệ thống',
                    source: 'VIETQR'
                };
            }
            throw new Error(`API returned ${response.status}`);
        }

        const json = await response.json();

        if (json.code === '00' && json.data) {
            return {
                success: true,
                data: {
                    taxCode: taxCode,
                    name: json.data.name,
                    shortName: json.data.shortName,
                    address: json.data.address,
                },
                source: 'VIETQR'
            };
        }

        // VietQR không có dữ liệu - user có thể nhập tay
        return {
            success: false,
            error: 'Không tìm thấy trong hệ thống tra cứu. Bạn có thể nhập tay thông tin.',
            source: 'VIETQR'
        };

    } catch (error) {
        console.error('MST Lookup error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Lỗi kết nối API',
            source: 'VIETQR'
        };
    }
}

/**
 * Kiểm tra format MST
 */
export function isValidTaxCodeFormat(taxCode: string): boolean {
    if (!taxCode) return false;

    // Clean input
    const cleaned = taxCode.replace(/[\s\-]/g, '');

    // MST 10 số hoặc 13 số
    const pattern10 = /^[0-9]{10}$/;
    const pattern13 = /^[0-9]{13}$/;

    return pattern10.test(cleaned) || pattern13.test(cleaned);
}

/**
 * So khớp tên công ty (fuzzy match)
 */
export function matchCompanyName(inputName: string, registeredName: string): { match: boolean; score: number } {
    if (!inputName || !registeredName) {
        return { match: false, score: 0 };
    }

    // Chuẩn hóa text
    const normalize = (s: string) => s
        .toUpperCase()
        .replace(/CÔNG TY/gi, 'CTY')
        .replace(/TRÁCH NHIỆM HỮU HẠN/gi, 'TNHH')
        .replace(/CỔ PHẦN/gi, 'CP')
        .replace(/TƯ NHÂN/gi, 'TN')
        .replace(/DOANH NGHIỆP/gi, 'DN')
        .replace(/THƯƠNG MẠI/gi, 'TM')
        .replace(/DỊCH VỤ/gi, 'DV')
        .replace(/VIỆT NAM/gi, 'VN')
        .replace(/[.,\-_()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const n1 = normalize(inputName);
    const n2 = normalize(registeredName);

    // Exact match
    if (n1 === n2) {
        return { match: true, score: 100 };
    }

    // Contains check
    if (n2.includes(n1) || n1.includes(n2)) {
        return { match: true, score: 90 };
    }

    // Calculate Levenshtein-based similarity
    const similarity = calculateSimilarity(n1, n2);

    return {
        match: similarity >= 70,
        score: similarity
    };
}

/**
 * Tính độ tương đồng giữa 2 chuỗi (0-100)
 */
function calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 100;

    const distance = levenshteinDistance(longer, shorter);
    return Math.round(((longer.length - distance) / longer.length) * 100);
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,      // deletion
                dp[i][j - 1] + 1,      // insertion
                dp[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return dp[m][n];
}

/**
 * Validate Partner với MST lookup + Name matching
 */
export async function validatePartner(
    taxCode: string,
    inputName: string
): Promise<PartnerValidation> {
    // 1. Lookup MST
    const lookup = await lookupTaxCode(taxCode);

    if (!lookup.success) {
        return {
            isValid: false,
            taxCodeStatus: 'INVALID',
            nameMatch: false,
            message: lookup.error || 'MST không hợp lệ'
        };
    }

    // 2. Check name match
    const nameMatch = matchCompanyName(inputName, lookup.data!.name);

    if (!nameMatch.match) {
        return {
            isValid: false,
            taxCodeStatus: 'ACTIVE',
            nameMatch: false,
            nameMatchScore: nameMatch.score,
            registeredName: lookup.data!.name,
            message: `Tên không khớp (${nameMatch.score}%). Tên đăng ký: ${lookup.data!.name}`
        };
    }

    return {
        isValid: true,
        taxCodeStatus: 'ACTIVE',
        nameMatch: true,
        nameMatchScore: nameMatch.score,
        registeredName: lookup.data!.name,
        message: 'MST hợp lệ và tên khớp'
    };
}
