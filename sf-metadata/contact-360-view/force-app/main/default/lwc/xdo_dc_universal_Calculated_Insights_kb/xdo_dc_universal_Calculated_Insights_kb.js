import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldDisplayValue, getFieldValue } from 'lightning/uiRecordApi';

export default class UniversalCalculatedInsights extends LightningElement {
    @api headerTitle;
    @api titleIcon;
    @api title;
    @api recordId;
    @api objectApiName;
    @api metric; // This holds the API Name string, e.g., "Amount"

    // 1. Construct the fully qualified field name (e.g., "Opportunity.Amount")
    get fieldKey() {
        return (this.objectApiName && this.metric) ? `${this.objectApiName}.${this.metric}` : undefined;
    }

    // 2. Prepare the fields array for the Wire service
    get fieldsToLoad() {
        return this.fieldKey ? [this.fieldKey] : [];
    }

    // 3. Fetch the data dynamically
    @wire(getRecord, { recordId: '$recordId', fields: '$fieldsToLoad' })
    record;

    // 4. Get the value. Try the "Display" version first (formatted), then raw value.
    get metricValue() {
        if (!this.record.data || !this.fieldKey) {
            return '';
        }
        // Try to get the formatted version (e.g., "$1,200.00")
        let value = getFieldDisplayValue(this.record.data, this.fieldKey);
        
        // If there is no formatted version (e.g., simple text), get the raw value
        if (!value) {
            value = getFieldValue(this.record.data, this.fieldKey);
        }
        return value;
    }
}