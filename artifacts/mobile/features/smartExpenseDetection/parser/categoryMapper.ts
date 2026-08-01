import type { ExpenseCategory } from '@/types';

/**
 * Maps merchant name keywords to a built-in {@link ExpenseCategory}.
 *
 * The app ships a closed set of expense categories, so merchants that map to
 * concepts without a dedicated category (e.g. groceries, transportation) are
 * folded into the closest existing bucket, and anything unknown falls back to
 * `'أخرى'` (the app's "other / uncategorized" category).
 *
 * Order matters: the first rule whose keyword is found wins.
 */
interface CategoryRule {
    category: ExpenseCategory;
    keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
    {
        category: 'قهوة',
        keywords: [
            'starbucks', 'ستاربكس', 'coffee', 'قهوة', 'barns', 'بارنز', 'dunkin',
            'cafe', 'كافيه', 'كافي', 'tim hortons', 'arabica', 'dose', 'دوز',
            'كوفي', 'espresso',
        ],
    },
    {
        category: 'مطاعم',
        keywords: [
            'ittha', 'restaurant', 'مطعم', 'herfy', 'هرفي', 'albaik', 'al baik',
            'البيك', 'mcdonald', 'ماكدونالدز', 'kfc', 'كنتاكي', 'burger', 'برجر',
            'shawarma', 'شاورما', 'pizza', 'بيتزا', 'kudu', 'كودو', 'tazaj', 'طازج',
            'subway', 'ساندويتش', 'مطاعم',
        ],
    },
    {
        category: 'تسوق',
        keywords: [
            'jarir', 'جرير', 'amazon', 'امازون', 'أمازون', 'noon', 'نون', 'extra',
            'اكسترا', 'إكسترا', 'ikea', 'ايكيا', 'shopping', 'متجر', 'store',
            'namshi', 'نمشي', 'centrepoint', 'سنتر بوينت', 'zara', 'زارا', 'apple',
            'ابل', 'آبل', 'tamimi', 'تميمي', 'panda', 'بنده', 'danube', 'الدانوب',
            'carrefour', 'كارفور', 'othaim', 'العثيم', 'lulu', 'لولو', 'nesto',
            'نستو', 'supermarket', 'هايبر', 'بقالة', 'سوبر ماركت',
        ],
    },
    {
        category: 'بنزين',
        keywords: [
            'petrol', 'بنزين', 'fuel', 'وقود', 'aldrees', 'الدريس', 'sasco', 'ساسكو',
            'petromin', 'بترومين', 'naft', 'نفط', 'gas station', 'محطة',
        ],
    },
    {
        category: 'صحة',
        keywords: [
            'pharmacy', 'صيدلية', 'nahdi', 'النهدي', 'dawaa', 'الدواء', 'hospital',
            'مستشفى', 'clinic', 'عيادة', 'مختبر',
        ],
    },
    {
        category: 'ترفيه',
        keywords: [
            'netflix', 'نتفلكس', 'spotify', 'سبوتيفاي', 'cinema', 'سينما', 'vox',
            'muvi', 'ترفيه', 'game', 'playstation', 'بلايستيشن',
        ],
    },
];

/**
 * Suggests an expense category for a merchant name. Returns `'أخرى'` when no
 * keyword matches so the caller always receives a valid category.
 */
export function suggestCategory(merchant: string): ExpenseCategory {
    const haystack = merchant.trim().toLowerCase();
    if (!haystack) return 'أخرى';
    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
            return rule.category;
        }
    }
    return 'أخرى';
}
