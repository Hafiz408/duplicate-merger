public with sharing class AccountController {

    @AuraEnabled(cacheable=true)
    public static List<Account> getAllAccounts() {
        String query = 'SELECT ';
        for(String field : Schema.SObjectType.Account.fields.getMap().keySet()) {
            Schema.DescribeFieldResult fieldDescribe = Schema.SObjectType.Account.fields.getMap().get(field).getDescribe();
            query += field + ', ';
        }
        query = query.removeEnd(', ');
        query += ' FROM Account ORDER BY Name asc';
        
        return Database.query(query);
    }

    @AuraEnabled(cacheable=true)
    public static String getAccountFields() {
        List<Map<String, Object>> columns = new List<Map<String, Object>>();
        
        Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.Account.fields.getMap();
        
        for(String fieldName : fieldMap.keySet()) {
            Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
            
            if(fieldDescribe.isAccessible()) {
                Map<String, Object> column = new Map<String, Object>();
                column.put('label', fieldDescribe.getLabel());
                column.put('fieldName', fieldName);
                column.put('type', getFieldType(fieldDescribe));
                columns.add(column);
            }
        }
        
        return JSON.serialize(columns);
    }

    private static String getFieldType(Schema.DescribeFieldResult fieldDescribe) {
        Schema.DisplayType fieldType = fieldDescribe.getType();
        switch on fieldType {
            when CURRENCY {
                return 'currency';
            }
            when DATE, DATETIME {
                return 'date';
            }
            when BOOLEAN {
                return 'boolean';
            }
            when INTEGER, DOUBLE, LONG {
                return 'number';
            }
            when PHONE {
                return 'phone';
            }
            when URL {
                return 'url';
            }
            when else {
                return 'text';
            }
        }
    }
}