(async function () {
    // send message to alarm system
    request('http://www.google.com', function (error, response, body) {
        //   console.log('error:', error); // Print the error if one occurred
        //   console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        //   console.log('body:', body); // Print the HTML for the Google homepage.
        console.log('_failures:', failures);
        console.log('keys', Object.keys(failures));
        console.log('values', Object.values(failures));
        let failureExecutions = Object.values(failures);
        for (let i in failureExecutions) {
            let failureExecution = failureExecutions[i];
            const testExecution = failureExecution.execution;
            // let failuresinfo = failuresvalues[i].failures;
            for (let j in failureExecution.failures) {
                let failure = failureExecution.failures[j];
                // const name = failure.source.name;
                console.log('testcase-name', failure.source.name);
                if (failure.at.indexOf('assertion') === 0) {
                    console.log('assertion:', JSON.stringify(testExecution.assertions));
                }
                // 测试脚本错误 错误明细 _failureId是键,  也会记录到执行结果觉和信息的testScripts上,json的数组
                else if (failure.at.indexOf('test-script') === 0) {
                    console.log('test-script:', testExecution);
                }

            }

        }
    });
    return 'Hello monitor-man.';
})()


//     [2021-01-10T14:01:40.726] [INFO] newman - 测试集[testmonitor#7518b160-50b4-11eb-8b2e-3f8787784fc8]执行完毕!
//     _failures: { 'bfdd1645-ebfb-4b3e-959d-92f19b001e3c':
//     { failures: [ [Object] ],
//         execution:
//         { item: [Object],
//             request: [Object],
//             response: [Object],
//             id: '2be5c017-ea4e-445c-a19c-815b2fdf139c',
//             assertions: [Array] } } }
// keys [ 'bfdd1645-ebfb-4b3e-959d-92f19b001e3c' ]
// values [ { failures: [ [Object] ],
//     execution:
//         { item: [Object],
//             request: [Object],
//             response: [Object],
//             id: '2be5c017-ea4e-445c-a19c-815b2fdf139c',
//             assertions: [Array] } } ]


// (async function() {
//     // send message to alarm system
//     return 'Hello monitor-man.';
// })()