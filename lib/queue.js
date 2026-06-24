export class TaskQueue {
    constructor(concurrency = 2) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    /**
     * إضافة مهمة جديدة إلى الطابور لتنفذ بالتتابع
     * @param {Function} taskFn - الدالة البرمجية للمهمة (يجب أن تعيد Promise)
     * @returns {Promise<any>}
     */
    add(taskFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ taskFn, resolve, reject });
            this.next();
        });
    }

    async next() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;

        this.running++;
        const { taskFn, resolve, reject } = this.queue.shift();

        try {
            const result = await taskFn();
            resolve(result);
        } catch (err) {
            reject(err);
        } finally {
            this.running--;
            this.next();
        }
    }
}

// طابور عام مخصص للعمليات الثقيلة والتحميلات
export const downloadQueue = new TaskQueue(2);
