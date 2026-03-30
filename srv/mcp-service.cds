service McpService @(path: '/mcp') {
    function health() returns String;
    function tools()  returns String;
    action   call(tool : String, input : String) returns String;
}