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
	let authorImageSize = 40;
	let force = d3.layout.force()
					.nodes(dataset.nodes)
					.links(dataset.edges)
					.size([w, h])
					.linkDistance([50])
					.charge([-150])
					.start();
	
	let svg = d3.select('#graph').append('svg').attr('width', w).attr('height', h);
	
	let edges = svg.selectAll('line')
					.data(dataset.edges)
					.enter()
					.append('line')
					.style('stroke', '#ccc')
					.style('stroke-width', 1);
	
	// Append domain circles
	let domainNodes = svg.selectAll('circle')
						.data(dataset.nodes.filter(d => typeof d.author == 'undefined'))
						.enter()
						.append('circle')
						.attr('r', d =>  d.authors.length * 4 + 4 )
						.style('fill', d => '#238b57')
						.on('mouseover', d => {
							let tooltip = d3.select('#tooltip');
							tooltip.classed('hidden', false);
							tooltip.select('#domain').text(d.domain);
							let authorString = '';
							d.authors.forEach(author => {
								if (authorString === '') authorString += `${author.username}`;
								else authorString += `, ${author.username}`;
							});
							tooltip.select('#authors').text(authorString);
						})
						.on('mouseout', d => d3.select('#tooltip').classed('hidden', true))
						.call(force.drag);
					
	let authorNodes = svg.selectAll('image')
						.data(dataset.nodes.filter(d => typeof d.author != 'undefined'))
						.enter()
						.append('svg:image')
						.attr('width', authorImageSize)
						.attr('height', authorImageSize)
						.attr('xlink:href', d => d.author.picture)
						.call(force.drag);
					
	force.on('tick', () => {
		edges
			.attr('x1', d => d.source.x)
			.attr('y1', d => d.source.y)
			.attr('x2', d => d.target.x)
			.attr('y2', d => d.target.y);
		domainNodes
			.attr('cx', d => d.x)
			.attr('cy', d => d.y);
		authorNodes
			.attr('x', d => d.x - authorImageSize / 2)
			.attr('y', d => d.y - authorImageSize / 2);
	});
	
/*	let authorNodes = document.getElementsByClassName('author');
	for (let i = 0; i < authorNodes.length; i++) {
		authorNodes[i].style.backgroundImage = `url(${authorNodes[i].__data__.author.picture})`;
	}*/
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
	let domainList = _.uniq( jsonData.map(article => htmlBaseRegex.exec(article.link)[0]) );

	// Create nodes for each domain and find all users that have pointed to it
	domainList.forEach(domain => {
		let authors = [];
		jsonData.forEach(article => {
			if (htmlBaseRegex.exec(article.link)[0] === domain) {
				let dupe = _.find(authors, author => author.userId === article.author.userId);
				if (typeof dupe === 'undefined') authors.push(article.author);
			}
		});
		let node = {
			domain: domain,
			authors: authors
		}
		dataset.nodes.push(node);
	});
	console.log(dataset.nodes);
	console.log(domainList);
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