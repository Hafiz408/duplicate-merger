/**
 * @description       : 
 * @author            : mohammedhafiz.shahulhameed@cat.com
 * @group             : 
 * @last modified on  : 08-18-2024
 * @last modified by  : mohammedhafiz.shahulhameed@cat.com
**/
public with sharing class HerokuApiIntegration {
    // to get the access token
    public static String getAccessToken() {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://fedloginqa.cat.com/as/token.oauth2');
        request.setMethod('POST');
        // request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        request.setTimeout(120000);
        
        String clientId = 'ECRM_GTS_cc_client';
        String clientSecret = 'nCLSFHIN5jEgmK96ZOTBVFPV3jg08YpDW0ZI2G2l6IKoHSuXYjAVTmJFNKuvDeQR';
        String body = 'grant_type=client_credentials&client_id=' + clientId + '&client_secret=' + clientSecret;
        request.setBody(body);
        
        HttpResponse response = http.send(request);
        if (response.getStatusCode() == 200) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
            return (String) result.get('access_token');
        } else {
            System.debug('Error: ' + response.getStatus());
            throw new CalloutException('Failed to get access token');
        }
    }

    @AuraEnabled
    public static String sendMergeRequest(String survivorId, List<String> collapsedIds){
        String accessToken = getAccessToken();
        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://service-now-integration-qa.herokuapp.com/mergerecords');
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('Authorization', 'Bearer ' + accessToken);
        request.setTimeout(120000); // Set timeout to 120 seconds
        
        Map<String, Object> mergeRequest = new Map<String, Object>();
        mergeRequest.put('parent_object', 'Account');
        mergeRequest.put('survivor_id', survivorId);
        mergeRequest.put('collapsed_id', collapsedIds);
        
        Map<String, Object> requestBody = new Map<String, Object>();
        requestBody.put('mergeRequest', mergeRequest);
        
        request.setBody(JSON.serialize(requestBody));
        
        HttpResponse response = http.send(request);
        Map<String, Object> result = new Map<String, Object>();
        
        result.put('statusCode', response.getStatusCode());
        result.put('body', response.getBody());
        
        System.debug('Response Status: ' + response.getStatusCode());
        System.debug('Response Body: ' + response.getBody());
        
        return JSON.serialize(result);
    }
}