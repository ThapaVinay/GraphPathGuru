const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
var cors= require('cors');
// const connectToMongo = require('./db');

// var bodyParser = require('body-parser');
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static(__dirname + '/views'));

// connectToMongo();
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// let processedData = "";

// app.set('views', path.join(__dirname, 'views'))
// app.set('view engine', 'html');
// app.engine('html', require('ejs').renderFile);

// app.use('/static', express.static('static'))
// app.use(express.urlencoded())


// write the data we get as request to the input file
app.post('/write-file', (req, res) => {
    try {
        const { nodes, edges } = req.body;

        console.log(nodes);
        console.log(edges);
        let output = "";
        const mp = {};
        let w = 0;
        for (var i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            mp[node.id] = [];
        }
        for (var i = 0; i < edges.length; i++) {
            let edge = edges[i];
            w = edge.label == undefined ? -1 : edge.label;
            mp[edge.source].push([edge.target, w]);
        }
        console.log(mp);
        for (var i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            output += node.id;

            output += ' ' + Math.floor(node.position.x).toString() + ' ' + Math.floor(node.position.y).toString() + ': ';
            if (mp)
                for (let j = 0; j < mp[node.id].length; j++) {
                    output += mp[node.id][j][0] + ',' + mp[node.id][j][1] + ' ';
                }
            output += '\n'
        }
        console.log(output);
        fs.writeFileSync('./file io/input.txt', output);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to save data to file' });
    }
});


app.post('/perform-dijktra', (req, res) => {

    // Specify the path to your C++ executable
    let dijkstraExecutable;

    if (os.platform() === 'win32') {
        dijkstraExecutable = './Dijkstra/Dijkstra.exe';
    }
    else if (os.platform() === 'linux') {
        dijkstraExecutable = './Dijkstra_linux/Dijkstra';
    }

    // Execute the C++ program
    execFile(dijkstraExecutable, (error, stdout, stderr) => {
        if (error) {
            console.error('Error:', error);
            res.status(500).send('An error occurred during execution.');
            return;
        }

        if (stderr) {
            console.error('Error:', stderr);
            res.status(500).send('An error occurred during execution.');
            return;
        }

        console.log('C++ program output:', stdout);

        res.send('C++ program executed successfully.');
    });
});


app.get('/', (req, res) => {
    res.send('Hello World!');
});

// to read the output file and send the data in the form of arrays
app.get('/read-file', (req, res) => {

    const fileContent = fs.readFileSync('./file io/output.txt', 'utf-8');

    const regex = /<adj>([\s\S]*?)<\/adj>/g;

    const adjDataArray = [];

    let match;
    while ((match = regex.exec(fileContent)) !== null) {
        const adjData = match[1].trim();
        adjDataArray.push(adjData);
    }

    console.log(adjDataArray);

    const result = [];
    const checkNode = []; 
    const distance_curr = [];
    const curr_node = [];

    for (const line of adjDataArray) {
        const match = line.match(/^(\d+)/);
        if (match) {
            const firstNumber = parseInt(match[1], 10);
            curr_node.push(firstNumber);
        }
    }

    adjDataArray.forEach(row => {
        const lines = row.split('\n');
        const values = [];
        const thirdValues = [];
        const numbersBeforeColon = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/(\d+):/); 
            if (match) {
                const number = parseInt(match[1], 10); 
                numbersBeforeColon.push(number);
            }

            if (i > 0) {
                const parts = lines[i].split('\t')[1];
                if (parts) {
                    const firstNumericValue = parseInt(parts.split(',')[0], 10);
                    const thirdNumericValue = parseInt(parts.split(',')[2], 10);
                    values.push(firstNumericValue);
                    thirdValues.push(thirdNumericValue);

                }
            }
        }

        checkNode.push(values);
        result.push(thirdValues);
        distance_curr.push(numbersBeforeColon);
    });

    // find the distance of the node to be checked from source node
    const distance = [];
    const dsMatches = fileContent.match(/<ds>[\s\S]*?<\/ds>/g);

    if (dsMatches) {
        const dsArray = dsMatches.map(ds => {
            const dsContent = ds.match(/<ds>([\s\S]*?)<\/ds>/)[1].trim();
            const dsLines = dsContent.split('\n');
            return dsLines
                .map(line => line.trim().split(/\s+/).map(val => (val === 'INF' ? 'INF' : parseInt(val, 10))));
        });


        for (let i = 0; i < dsArray.length; i++) {
            distance.push(dsArray[i][1]);
        }

    }

    // to remove the undefined (0) error due to timeout function
    checkNode.push([]);
    result.push([]);

    console.log(distance);
    console.log(checkNode);
    console.log(result);
    console.log(curr_node);

    const responseData = {
        result,
        checkNode,
        distance,
        distance_curr,
        curr_node,
    };

    res.json(responseData);
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});