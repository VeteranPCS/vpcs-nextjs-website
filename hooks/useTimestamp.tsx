"use client";
import { useEffect } from "react";
const useTimestamp = () => {
    useEffect(() => {
        const updateTimestamp = () => {
            const response = document.getElementById("g-recaptcha-response") as HTMLInputElement;
            if (!response || response.value.trim() === "") {
                const captchaSettingsElem = document.getElementById("captcha_settings") as HTMLInputElement | null;
                if (captchaSettingsElem) {
                    const captchaSettings = JSON.parse(captchaSettingsElem.value);
                    captchaSettings.ts = JSON.stringify(new Date().getTime());
                    captchaSettingsElem.value = JSON.stringify(captchaSettings);
                }
            }
        };
        const interval = setInterval(updateTimestamp, 500);
        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, []);
};
export default useTimestamp;