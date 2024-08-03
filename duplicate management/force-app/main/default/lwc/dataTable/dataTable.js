import { LightningElement, track, api } from 'lwc';
import getAllAccounts from '@salesforce/apex/AccountController.getAllAccounts';
import getAccountFields from '@salesforce/apex/AccountController.getAccountFields';

const PAGE_SIZE = 20;

export default class DataTable extends LightningElement {
    @api header;
    @api selectedRecords = [];
    @api hideCheckboxColumn = false;

    @track searchTerm = '';
    @track filteredAccounts = [];
    @track filterCriteria = [{ id: 1, field: '', operator: '', value: '' }];
    @track isFilterOpen = false;
    @track columns = [];
    @track selectedColumns = ['name', 'createddate'];
    @track columnsToDisplay = [];
    @track columnSelectionData = [];
    @track isColumnFilterOpen = false;
    @track allSelectedRecords = new Set(); 
    @track error;


    @track sortBy;
    @track sortDirection = 'asc';

    

    currentPage = 1;
    totalRecords = 0;
    totalPages = 0;
    allRecords = [];
    allAccounts = [];

    operatorOptions = [
        { label: 'Equals', value: '=' },
        { label: 'Not Equal', value: '!=' },
        { label: 'Contains', value: 'LIKE' },
        { label: 'Does Not Contain', value: 'NOT LIKE' },
        { label: 'Starts With', value: 'LIKE%' },
        { label: 'Ends With', value: '%LIKE' }
    ];
    
    async connectedCallback() {
        try {
            await this.loadAccountFields();
            await this.initializeData();
            this.prepareColumnSelectionData();
            this.setColumnsToDisplay();
            this.allSelectedRecords = new Set(this.selectedRecords.map(record => record.id));
        } catch (error) {
            this.error = error;
            console.error('Error in initialization:', error);
        }
    }

    async initializeData() {
        if (this.hideCheckboxColumn && this.selectedRecords) {
            this.allRecords = [...this.selectedRecords];
            this.allAccounts = [...this.selectedRecords];
            this.applySearchAndPagination();
        } else {
            await this.loadAllAccounts();
        }
    }

    async loadAllAccounts() {
        try {
            const result = await getAllAccounts();
            this.allAccounts = result.map(account => {
                const lowercaseAccount = {};
                Object.keys(account).forEach(key => {
                    lowercaseAccount[key.toLowerCase()] = account[key];
                });
                lowercaseAccount.nameurl = `/lightning/r/Account/${account.Id}/view`;
                return lowercaseAccount;
            });
            console.log('Account records loaded:', this.allAccounts);
            this.applySearchAndFilter();
        } catch (error) {
            console.error('Error loading accounts:', error);
            throw error;
        }
    }

    async loadAccountFields() {
        try {
            const result = await getAccountFields();
            this.columns = JSON.parse(result).map(column => {
                if (column.fieldName.toLowerCase() === 'name') {
                    return {
                        ...column,
                        type: 'url',
                        typeAttributes: {
                            label: { fieldName: 'name' },
                            target: '_blank'
                        },
                        fieldName: 'nameurl'
                    };
                }
                return {
                    ...column,
                    //sorting
                    sortable: true
                };
            });
            
            // Sort the columns alphabetically by label
            this.columns.sort((a, b) => {
                const labelA = a.label.toLowerCase();
                const labelB = b.label.toLowerCase();
                if (labelA < labelB) return -1;
                if (labelA > labelB) return 1;
                return 0;
            });

            console.log('Account fields loaded:', this.columns);
        } catch (error) {
            console.error('Error loading account fields:', error);
            throw error;
        }
    }
    //sorting
    handleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        this.sortBy = sortedBy;
        this.sortDirection = sortDirection;
        this.applySearchAndFilter();
    }

    applySearchAndFilter() {
        let filteredRecords = this.allAccounts;

        if (this.searchTerm) {
            const lowercaseSearchTerm = this.searchTerm.toLowerCase();
            filteredRecords = filteredRecords.filter(record =>
                record.name.toLowerCase().includes(lowercaseSearchTerm) ||
                (record.phone && record.phone.toLowerCase().includes(lowercaseSearchTerm)) ||
                (record.industry && record.industry.toLowerCase().includes(lowercaseSearchTerm))
            );

        }

        if (this.filterCriteria.length > 0) {
            filteredRecords = filteredRecords.filter(record => {
                return this.filterCriteria.every(criteria => {
                    if (!criteria.field || !criteria.operator || !criteria.value) return true;
                    const fieldValue = record[criteria.field.toLowerCase() == "nameurl" ? "name" : criteria.field.toLowerCase()];
                    const criteriaValue = criteria.value.toLowerCase();
                    console.log(criteria.field.toLowerCase(), fieldValue, record);
                    switch (criteria.operator) {
                        case '=': return fieldValue && fieldValue.toLowerCase() == criteriaValue;
                        case '!=': return fieldValue && fieldValue.toLowerCase() != criteriaValue;
                        case 'LIKE': return fieldValue && fieldValue.toLowerCase().includes(criteriaValue);
                        case 'NOT LIKE': return !fieldValue || !fieldValue.toLowerCase().includes(criteriaValue);
                        case 'LIKE%': return fieldValue && fieldValue.toLowerCase().startsWith(criteriaValue);
                        case '%LIKE': return fieldValue && fieldValue.toLowerCase().endsWith(criteriaValue);
                        default: return true;
                    }
                });
            });
        }

        if (this.sortBy) {//sorting
            filteredRecords = this.sortData(filteredRecords, this.sortBy, this.sortDirection);
        }


        this.totalRecords = filteredRecords.length;
        this.totalPages = Math.ceil(this.totalRecords / PAGE_SIZE);
        this.sortedAndFilteredRecords = filteredRecords;//sorting
        const start = (this.currentPage - 1) * PAGE_SIZE;
        const end = this.currentPage * PAGE_SIZE;
        this.filteredAccounts = filteredRecords.slice(start, end);
        this.updatePageData();//sorting
    }

    updatePageData() {
        const start = (this.currentPage - 1) * PAGE_SIZE;
        const end = this.currentPage * PAGE_SIZE;
        this.filteredAccounts = this.sortedAndFilteredRecords.slice(start, end);
        
        // Set selected rows
        if (this.template.querySelector('lightning-datatable')) {
            const selectedRows = this.filteredAccounts
                .filter(account => this.allSelectedRecords.has(account.id))
                .map(account => account.id);
            this.template.querySelector('lightning-datatable').selectedRows = selectedRows;
        }
    }

    //for sorting column data
    sortData(data, fieldName, direction) {
        const clonedData = [...data];
        //const selectedIds = this.selectedRecords.map(record => record.id);
        return clonedData.sort((a, b) => {
            let aValue = this.getFieldValue(a, fieldName);
            let bValue = this.getFieldValue(b, fieldName);
            // Handle the special case for 'nameurl'
            if (fieldName === 'nameurl') {
                aValue = a.name;
                bValue = b.name;
            }
            // Convert to lowercase for case-insensitive comparison
            if (typeof aValue === 'string') aValue = aValue.toLowerCase();
            if (typeof bValue === 'string') bValue = bValue.toLowerCase();
            if (aValue === bValue) return 0;
        if (aValue == null) return direction === 'asc' ? -1 : 1;
        if (bValue == null) return direction === 'asc' ? 1 : -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        // this.selectedRecords = clonedData.filter(record => selectedIds.includes(record.id));
        // this.filteredAccounts = clonedData;
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
}

    //sorting
    getFieldValue(record, fieldName) {
        // Handle the special case for 'nameurl'
        if (fieldName === 'nameurl') return record.name;

        const fields = fieldName.split('.');
        return fields.reduce((obj, field) => obj && obj[field.toLowerCase()], record);
    }


    applySearchAndPagination() {
        let filteredRecords = this.allRecords;

        if (this.searchTerm) {
            filteredRecords = this.allRecords.filter(record =>
                record.name.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        }
        this.totalRecords = filteredRecords.length;
        this.totalPages = Math.ceil(this.totalRecords / PAGE_SIZE);
        const start = (this.currentPage - 1) * PAGE_SIZE;
        const end = this.currentPage * PAGE_SIZE;
        this.filteredAccounts = filteredRecords.slice(start, end);
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.currentPage = 1;
        if (this.hideCheckboxColumn) {
            this.applySearchAndPagination();
        } else {
            this.applySearchAndFilter();
        }
    }

    prepareColumnSelectionData() {
        this.columnSelectionData = this.columns.map(column => ({
            ...column,
            selected: this.selectedColumns.includes(column.fieldName)
        }));
    }

    handlePrevious() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePageData();
        }
    }

    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePageData();
        }
    }

    handleFilterClick() {
        this.isFilterOpen = true;
    }

    closeFilterModal() {
        this.isFilterOpen = false;
    }

    handleFieldChange(event) {
        const index = event.target.dataset.index;
        this.filterCriteria[index].field = event.target.value;
    }

    handleOperatorChange(event) {
        const index = event.target.dataset.index;
        this.filterCriteria[index].operator = event.target.value;
    }

    handleValueChange(event) {
        const index = event.target.dataset.index;
        this.filterCriteria[index].value = event.target.value;
    }

    addFilterCriteria() {
        this.filterCriteria.push({ id: Date.now(), field: '', operator: '', value: '' });
    }

    removeFilterCriteria() {
        if (this.filterCriteria.length > 1) {
            this.filterCriteria.pop();
        } else {
            this.filterCriteria = [{ id: 1, field: '', operator: '', value: '' }];
        }
    }

    applyFilter() {
        this.applySearchAndFilter();
        this.closeFilterModal();
    }

    setColumnsToDisplay() {
        this.columnsToDisplay = this.columns.filter(column =>
            this.selectedColumns.includes(column.fieldName) || column.fieldName === 'nameurl'
        ).map(column => ({
            ...column,
            sortable: true
        }));
    }

    handleColumnFilterClick() {
        this.isColumnFilterOpen = true;
    }

    closeColumnFilterModal() {
        this.isColumnFilterOpen = false;
    }

    applyColumnFilter() {
        this.handleColumnFilterChange();
        this.closeColumnFilterModal();
    }

    handleColumnFilterChange(event = null) {
        const selected = Array.from(
            this.template.querySelectorAll('lightning-input[data-id="columnSelect"]')
        ).filter(input => input.checked)
         .map(input => input.value);
        this.selectedColumns = selected;
        this.setColumnsToDisplay();
        this.prepareColumnSelectionData();
    }

    handleSelection(event) {
        const selectedRows = event.detail.selectedRows;
        
        // Update allSelectedRecords
        selectedRows.forEach(row => this.allSelectedRecords.add(row.id));
        this.filteredAccounts.forEach(account => {
            if (!selectedRows.some(row => row.id === account.id)) {
                this.allSelectedRecords.delete(account.id);
            }
        });
    
        this.selectedRecords = Array.from(this.allSelectedRecords)
            .map(id => this.allAccounts.find(account => account.id === id))
            .filter(Boolean);
    
        console.log('Selected', this.header, ':', this.selectedRecords);
    
        const selectEvent = new CustomEvent('recordselection', {
            detail: {
                name: this.header,
                selectedRecords: this.selectedRecords
            }
        });
        this.dispatchEvent(selectEvent);
    }

    get fieldOptions() {
        return this.columns.map(column => ({
            label: column.label,
            value: column.fieldName,
            type: column.type
        }));
    }

    get maxRowSelection() {
        return this.header === "Master Record" ? "1" : undefined;
    }

    get markedRecords() {
        console.log('in markedRecords', this.selectedRecords);
        if (this.selectedRecords && this.selectedRecords.length > 0) {
            return this.selectedRecords.map(record => record.id);
        }
        return [];
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage === this.totalPages;
    }
    
    get isAddDisabled() {
        if (this.filterCriteria.length === 0) {
            return true;
        }
        const lastItem = this.filterCriteria[this.filterCriteria.length - 1];
        return Object.values(lastItem).some(value => value === '');
    }

    get isRemoveDisabled() {
        const firstCriterion = this.filterCriteria[0];
        return Object.entries(firstCriterion)
            .filter(([key, _]) => key !== 'id')
            .every(([_, value]) => value === '');
    }
}