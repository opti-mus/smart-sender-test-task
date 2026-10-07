export type StorageType = "local" | "session";
export type StorageKey = "fingerprint" | "device_session_token";

class StorageWrapper {
    private storage?: Storage;

    constructor(type: StorageType) {
        try {
            this.storage = type === "local" ? window.localStorage : window.sessionStorage;
        } catch (error) {
            console.error(error);
        }
    }

    get length() {
        if (!this.storage) return;

        return this.storage.length;
    }

    get<T>(key: StorageKey) {
        if (!this.storage) return;

        try {
            const value = this.storage.getItem(key);

            if (value === null) {
                return;
            }

            return JSON.parse(value) as T;
        } catch (error) {
            console.error(error);
        }
    }

    set(key: StorageKey, value: unknown) {
        if (!this.storage) return;

        try {
            const stringValue = JSON.stringify(value);

            this.storage.setItem(key, stringValue);
        } catch (error) {
            console.error(error);
        }
    }

    remove(key: StorageKey) {
        if (!this.storage) return;

        this.storage.removeItem(key);
    }

    clear() {
        if (!this.storage) return;

        this.storage.clear();
    }
}

export const localStorageWrapper = new StorageWrapper("local");
export const sessionStorageWrapper = new StorageWrapper("session");

export const getFingerprint = (): string => localStorageWrapper.get<string>('fingerprint') ?? ''
export const setFingerprint = (fingerprint: string) => {
    if (!fingerprint) return;
    if (getFingerprint()) return
    localStorageWrapper.set('fingerprint', fingerprint)
}