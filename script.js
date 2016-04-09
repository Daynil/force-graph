'use strict';
require('./styles.css');
const d3 = require('d3');
const axios = require('axios');
const _ = require('lodash');

const w = 800;
const h = 800;

window.onload = init();

function init() {
	axios.get('./data.json')
		.then(res => plotData(res.data));
}

function plotData(jsonData) {
	let dataset = parseData(jsonData);
	console.log(dataset);
	let force = d3.layout.force()
					.nodes(dataset.nodes)
					.links(dataset.edges)
					.size([w, h])
					.linkDistance([50])
					.charge([-120])
					.start();
	
	let svg = d3.select('#graph').append('svg').attr('width', w).attr('height', h);
	
	let edges = svg.selectAll('line')
					.data(dataset.edges)
					.enter()
					.append('line')
					.style('stroke', '#ccc')
					.style('stroke-width', 1);
	let nodes = svg.selectAll('circle')
					.data(dataset.nodes)
					.enter()
					.append('circle')
					.attr('r', d => {
						if (typeof d.author == 'undefined') return d.authors.length * 2;
						else return 5;
					})
					.style('fill', d => {
						if (typeof d.author != 'undefined') {
							return 'rgb(0, 255, 0)';
						} else return 'rgb(0, 0, 255)';
					})
					.call(force.drag);
					
	force.on('tick', () => {
		edges
			.attr('x1', d => d.source.x)
			.attr('y1', d => d.source.y)
			.attr('x2', d => d.target.x)
			.attr('y2', d => d.target.y);
		nodes
			.attr('cx', d => d.x)
			.attr('cy', d => d.y);
	});
}

function parseData(jsonData) {
	/* Data format
	[
		{
			"id": "57068e9be3fb2c240e0c8ef4",
			"headline": "How Internet of Things (IOT) is acting as a Master in Digitize Consumer’s World using N...",
			"timePosted": 1460047515551,
			"link": "https://acadgild.com/blog/internet-things-iot-acting-master-digitize-consumers-world-using-node-js/",
			"metaDescription": "",
			"description": "undefined",
			"rank": 1,
			"upVotes": [
				{
					"upVotedBy": "56aa5599d1c119b24c18dcc9",
					"upVotedByUsername": "1234576"
				}
			],
			"author": {
				"picture": "https://avatars.githubusercontent.com/u/15155428?v=3",
				"userId": "56aa5599d1c119b24c18dcc9",
				"username": "1234576"
			},
			"image": "https://acadgild.com/blog/wp-content/uploads/2016/03/IOT.jpg",
			"storyLink": "how internet of things iot is acting as a master in digitize consumers world using n"
		}, ]
	*/
	let dataset = {nodes: [], edges: []};
	//let htmlBaseRegex = /(https?:\/\/.*\.c?o?m?i?o?\/)/;
	let htmlBaseRegex = /.*(\.[a-z]{2,3}\/)/;
	let domainList = _.sortedUniq( jsonData.map(article => htmlBaseRegex.exec(article.link)[0]) );

	// Create nodes for each domain and find all users that have pointed to it
	domainList.forEach(domain => {
		let authors = [];
		jsonData.forEach(article => {
			if (htmlBaseRegex.exec(article.link)[0] === domain) {
				authors.push(article.author);
			}
		});
		let node = {
			domain: domain,
			authors: authors
		}
		dataset.nodes.push(node);
	});
	
	// Create nodes for each user uniquely
	jsonData.forEach(article => {
		let match = _.find(dataset.nodes, n => {
			if (typeof n.author != 'undefined') {
				return n.author.userId === article.author.userId;
			} else return false;
		});
		if (typeof match === 'undefined') {
			let node = {
				author: article.author
			}
			dataset.nodes.push(node);
		}
	});
	
	// Create links between each domain node and posting author
	for (let i = 0; i < dataset.nodes.length; i++) {
		let currNode = dataset.nodes[i];
		if (currNode.domain != null) {
			for (let j = 0; j < currNode.authors.length; j++) {
				let domainAuthor = currNode.authors[j];
				for (let k = 0; k < dataset.nodes.length; k++) {
					let curAuthNode = dataset.nodes[k];
					if (typeof curAuthNode.author != 'undefined') {
						if (domainAuthor.userId === curAuthNode.author.userId) {
							dataset.edges.push({ source: i, target: k });
						}
					}
				}
			}
		}
	}
	return dataset;
}