// src/lib/constants/regex.ts
// Centralized Regex patterns - Dùng chung cho Frontend & Backend

/**
 * Regex số điện thoại Việt Nam
 * Hỗ trợ: 03x, 05x, 07x, 08x, 09x (10 số)
 * Có thể có +84 hoặc 84 ở đầu
 */
export const PHONE_REGEX =
    /^(?:\+?84|0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

/**
 * Regex mã số thuế Việt Nam
 * 10 số hoặc 13 số (10 số + "-" + 3 số chi nhánh)
 */
export const TAX_CODE_REGEX = /^[0-9]{10}(-[0-9]{3})?$/;

/**
 * Regex CMND/CCCD Việt Nam
 * CMND: 9 hoặc 12 số
 * CCCD: 12 số
 */
export const IDENTITY_CARD_REGEX = /^[0-9]{9}$|^[0-9]{12}$/;

/**
 * Regex email chuẩn
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Regex tên (chỉ chữ cái, dấu tiếng Việt, khoảng trắng)
 */
export const NAME_REGEX = /^[a-zA-ZÀ-ỹ\s]+$/;

/**
 * Regex mã code (chữ và số, không dấu, không khoảng trắng)
 */
export const CODE_REGEX = /^[A-Z0-9]+$/;

/**
 * Regex số nguyên dương
 */
export const POSITIVE_INTEGER_REGEX = /^[1-9][0-9]*$/;

/**
 * Regex số tiền (có thể có dấu phẩy ngăn cách)
 */
export const MONEY_REGEX = /^[0-9]{1,3}(,[0-9]{3})*(\.[0-9]{1,2})?$/;
