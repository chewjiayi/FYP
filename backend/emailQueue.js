// emailQueue.js - Simple email queue system for background processing
const emailService = require('./emailService');

class EmailQueue {
    constructor(db) {
        this.queue = [];
        this.db = db;
        this.isProcessing = false;
        this.maxRetries = 3;
        this.processingDelay = 3000; // 3 seconds between emails
        this.stats = {
            totalQueued: 0,
            totalSent: 0,
            totalFailed: 0
        };
        
        console.log('📧 Email queue initialized');
    }
    
    addToQueue(name, email, photoFilename, metadata = {}) {
        const queueItem = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name,
            email,
            photoFilename,
            metadata,
            addedAt: new Date(),
            attempts: 0,
            status: 'queued'
        };
        
        this.queue.push(queueItem);
        this.stats.totalQueued++;
        
        console.log(`📧 Added to queue: ${email} (ID: ${queueItem.id}), Queue size: ${this.queue.length}`);
        
        // Start processing if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        return queueItem.id;
    }
    
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.queue.length > 0) {
            const item = this.queue[0]; // Peek at first item
            
            console.log(`📧 Processing email for ${item.email} (Attempt: ${item.attempts + 1})`);
            item.status = 'processing';
            item.lastAttemptAt = new Date();
            
            try {
                const result = await emailService.sendEmailAndUpdateFlag(
                    this.db,
                    item.name,
                    item.email,
                    item.photoFilename
                );
                
                if (result.success) {
                    // Success - remove from queue
                    this.queue.shift();
                    item.status = 'sent';
                    item.sentAt = new Date();
                    item.result = result;
                    this.stats.totalSent++;
                    
                    console.log(`✅ Email sent to ${item.email} (ID: ${item.id})`);
                    
                    // Wait before processing next item
                    if (this.queue.length > 0) {
                        await this.delay(this.processingDelay);
                    }
                } else {
                    // Failed - check retries
                    item.attempts++;
                    item.lastError = result.error;
                    
                    if (item.attempts >= this.maxRetries) {
                        // Max retries reached - move to failed
                        this.queue.shift();
                        item.status = 'failed';
                        item.failedAt = new Date();
                        this.stats.totalFailed++;
                        
                        console.error(`❌ Email failed permanently for ${item.email} after ${this.maxRetries} attempts`);
                    } else {
                        // Retry later - move to end of queue
                        const failedItem = this.queue.shift();
                        this.queue.push(failedItem);
                        item.status = 'retrying';
                        
                        console.log(`⚠️ Email failed for ${item.email}, will retry later (${item.attempts}/${this.maxRetries})`);
                        
                        // Wait longer before retry
                        await this.delay(this.processingDelay * 2);
                    }
                }
            } catch (error) {
                console.error(`❌ Unexpected error processing email for ${item.email}:`, error);
                item.attempts++;
                item.lastError = error.message;
                
                if (item.attempts >= this.maxRetries) {
                    this.queue.shift();
                    item.status = 'failed';
                    this.stats.totalFailed++;
                } else {
                    const failedItem = this.queue.shift();
                    this.queue.push(failedItem);
                    await this.delay(this.processingDelay * 2);
                }
            }
        }
        
        this.isProcessing = false;
        console.log(`📧 Queue processing complete. Stats: ${this.stats.totalSent} sent, ${this.stats.totalFailed} failed`);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getQueueStatus() {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.queue.length,
            stats: { ...this.stats },
            currentItems: this.queue.map(item => ({
                id: item.id,
                email: item.email,
                status: item.status,
                attempts: item.attempts,
                addedAt: item.addedAt
            }))
        };
    }
    
    clearQueue() {
        const clearedCount = this.queue.length;
        this.queue = [];
        console.log(`📧 Cleared ${clearedCount} items from queue`);
        return clearedCount;
    }
}

module.exports = EmailQueue;