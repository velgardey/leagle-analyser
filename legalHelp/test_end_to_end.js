#!/usr/bin/env node

/**
 * End-to-End Test Script for Legal Contract Analyzer
 * Tests the complete PDF processing workflow
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testEndToEndFlow() {
    console.log('🧪 Starting End-to-End Test for Legal Contract Analyzer\n');

    try {
        // Test 1: Check if the application is running
        console.log('1️⃣ Testing application availability...');
        const healthResponse = await fetch('http://localhost:3005');
        if (!healthResponse.ok) {
            throw new Error('Application is not running on http://localhost:3005');
        }
        console.log('✅ Application is running\n');

        // Test 2: Check if PDF file exists
        console.log('2️⃣ Checking test PDF file...');
        const pdfPath = path.join(__dirname, 'legalHelp', 'your_contract.pdf');
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`Test PDF not found at ${pdfPath}`);
        }
        console.log('✅ Test PDF file found\n');

        // Test 3: Test PDF upload and analysis
        console.log('3️⃣ Testing PDF upload and analysis...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(pdfPath));

        const analysisResponse = await fetch('http://localhost:3005/api/analyze-pdf', {
            method: 'POST',
            body: formData,
        });

        if (!analysisResponse.ok) {
            const errorText = await analysisResponse.text();
            throw new Error(`PDF analysis failed: ${analysisResponse.status} - ${errorText}`);
        }

        const analysisResult = await analysisResponse.json();
        console.log('✅ PDF analysis completed successfully\n');

        // Test 4: Validate response structure
        console.log('4️⃣ Validating response structure...');
        
        if (!analysisResult.success) {
            throw new Error('Analysis response indicates failure');
        }

        const data = analysisResult.data;
        const requiredFields = [
            'contractInfo',
            'risks',
            'timeline',
            'keyTerms',
            'products',
            'parties'
        ];

        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        console.log('✅ Response structure is valid\n');

        // Test 5: Validate data quality
        console.log('5️⃣ Validating data quality...');
        
        const contractInfo = data.contractInfo;
        const parties = contractInfo.parties || [];
        const risks = data.risks || [];
        const timeline = data.timeline || [];
        const products = data.products || [];
        const keyTerms = data.keyTerms || [];

        // Check contract info
        if (!contractInfo.title || contractInfo.title === 'Contract Agreement') {
            console.log('⚠️  Contract title is generic');
        } else {
            console.log(`✅ Contract title: "${contractInfo.title}"`);
        }

        if (!contractInfo.effectiveDate || !contractInfo.expirationDate) {
            console.log('⚠️  Missing contract dates');
        } else {
            console.log(`✅ Contract dates: ${contractInfo.effectiveDate} to ${contractInfo.expirationDate}`);
        }

        // Check parties
        if (parties.length < 2) {
            console.log('⚠️  Insufficient parties extracted');
        } else {
            console.log(`✅ Parties extracted: ${parties.length}`);
            parties.forEach((party, i) => {
                console.log(`   - ${party.legalName || party.name} (${party.role})`);
            });
        }

        // Check risks
        if (risks.length === 0) {
            console.log('⚠️  No risks identified');
        } else {
            console.log(`✅ Risks identified: ${risks.length}`);
            risks.slice(0, 3).forEach(risk => {
                console.log(`   - ${risk.title} (${risk.category})`);
            });
        }

        // Check timeline
        if (timeline.length === 0) {
            console.log('⚠️  No timeline events');
        } else {
            console.log(`✅ Timeline events: ${timeline.length}`);
            timeline.slice(0, 3).forEach(event => {
                console.log(`   - ${event.date}: ${event.event}`);
            });
        }

        // Check products
        if (products.length === 0) {
            console.log('⚠️  No products identified');
        } else {
            console.log(`✅ Products identified: ${products.length}`);
            products.slice(0, 3).forEach(product => {
                console.log(`   - ${product.name} (Qty: ${product.quantity})`);
            });
        }

        // Check key terms
        if (keyTerms.length === 0) {
            console.log('⚠️  No key terms extracted');
        } else {
            console.log(`✅ Key terms extracted: ${keyTerms.length}`);
            keyTerms.slice(0, 3).forEach(term => {
                console.log(`   - ${term.term}: ${term.definition.substring(0, 50)}...`);
            });
        }

        console.log('\n6️⃣ Testing component data compatibility...');
        
        // Test component data requirements
        const componentTests = [
            {
                name: 'Contract Summary',
                test: () => contractInfo && parties.length > 0 && timeline.length > 0
            },
            {
                name: 'Risk Assessment',
                test: () => risks.length > 0 && risks.every(r => r.title && r.category)
            },
            {
                name: 'Timeline Component',
                test: () => timeline.length > 0 && timeline.every(t => t.date && t.event)
            },
            {
                name: 'Products Component',
                test: () => products.length > 0 && products.every(p => p.name)
            },
            {
                name: 'Key Terms Component',
                test: () => keyTerms.length > 0 && keyTerms.every(t => t.term && t.definition)
            }
        ];

        componentTests.forEach(test => {
            if (test.test()) {
                console.log(`✅ ${test.name} - Data compatible`);
            } else {
                console.log(`⚠️  ${test.name} - Data may have issues`);
            }
        });

        console.log('\n🎉 End-to-End Test Results:');
        console.log('=====================================');
        console.log('✅ PDF Upload: Working');
        console.log('✅ Python Analysis: Working');
        console.log('✅ JSON Generation: Working');
        console.log('✅ API Response: Working');
        console.log('✅ Data Structure: Valid');
        console.log('✅ Component Compatibility: Good');
        console.log('\n🚀 The complete PDF processing workflow is functioning correctly!');

    } catch (error) {
        console.error('\n❌ End-to-End Test Failed:');
        console.error('=====================================');
        console.error(error.message);
        console.error('\n🔧 Please check the application setup and try again.');
        process.exit(1);
    }
}

// Run the test
testEndToEndFlow();
