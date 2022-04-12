// ==UserScript==
// @name         BitBucket search my branches
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  To add a filter drop down to the bitbucket branches page to filter by users
// @author       Jessica Moolenschot
// @match        https://bitbucket.org/*
// @downloadURL  https://github.com/NerdyJ23/bitbucketfilter/blob/main/script.js
// @updateURL    https://github.com/NerdyJ23/bitbucketfilter/blob/main/script.js
// @icon         https://d301sr5gafysq2.cloudfront.net/frontbucket/assets/present/build-favicon-default.df3a1f57.ico
// @grant        none
// @run-at       document-end
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require      file://C:\\Users\\jessica.moolenschot\\Git\\bitbucketfilter\\script.js

// ==/UserScript==

let main = "#userBranchDiv";
(function() {
    'use strict';
    let lastUrl = location.href;
    if(lastUrl.indexOf('/branches/') != -1)
    {
        console.log("on branch");
        setTimeout(function() {
            init();
        },1000);// need basic DOM to load, since bitbucket uses OnePAge application it needs time to load even with run at doc end
    }

    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            if(url.indexOf('/branches/') != -1)
            {
                console.log("on branch tree");
                setTimeout(function() {
                    init();
                },1000);
            }
            console.log(`new url is ${lastUrl}`);
        }
    }).observe(document, {subtree: true, childList: true});
})();

function init()
{
    //console.log($(main).html());
    if($(main).html() === null)
    {
        addUI();
        addEvents();
        getUsersInWorkspace(0);
    }
}

function addFilteredBranch(branch)
{
    $("#filteredBranches").append(`
        <span>
            <a href="${branch.links.html.href}">${branch.name}</a>
        </span>
        </br>
    `);
}

function getBranchByUser(data)
{
    let jsondata = JSON.parse(data);
    let user = $(`#userList`).find(":selected").html();
    //console.log(jsondata);
    for(let i = 0; i < jsondata.values.length; i++)
    {
        if(jsondata.values[i].target.author.user.display_name == user) 
        {
            console.log(jsondata.values[i]);
            addFilteredBranch(jsondata.values[i]);
        }
    }
    //get selected user from selection menu
    //parse json data
    //add to filtered branches
}

function getUsersInWorkspace(page) //no easy internal API for this one, gotta scour the HTML
{
    let url = `https://bitbucket.org/${getCurrentWorkspace()}/workspace/members/?page=${page+1}`
    let userArray = [];
    let memberPage = null;
    //let url = `https://api.bitbucket.org/2.0/workspaces/${getCurrentWorkspace()}/members`;
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState == 4 && this.status == 200) {
            let dropdownHTML = $("#userList");
            memberPage= $(this.responseText);

            let memberCount = $(memberPage).find('#filter-pjax').find('p').text();
            memberCount = (memberCount.slice(memberCount.indexOf(':')+1, memberCount.length)).trim();
            console.log(`There are ${memberCount} users in this group`);

            let memberList = $(memberPage).find(".user");
            let i = memberCount / 30;
            let r = memberCount - (30 * page);
            if(r > 30)
            {
                r = 30;
                getUsersInWorkspace(page+1);
            }
            let users = $(memberList).find('.name--overflow-wrap');

            for(let user = 0; user < users.length; user++)
            {
                let u = $(users[user]).text().trim();
                dropdownHTML.append(`<option value=''>${u}</option>`);
            }

        }
    }
    url = encodeURL(url);
    xhttp.open("GET", url);
    xhttp.send();
}
function addEvents()
{
    $(`#filter`).on("click",function() {
        $("#filteredBranches").html("<span id='loading'>LOADING....</span>");

        loadBranches();
    });
}
function loadBranches()
{
    /*return new Promise(resolve => {
        console.log("loading....");
        //let done = await branchPage(1);
        await branchPage(2);
        branchPage(3);
        branchPage(4);
        branchPage(5);
        //console.log("loaded?");
        console.log("done");
        resolve("DONE");
    });*/

    (async() => {
        console.log("starting");
        await(branchPage(1));
        await(branchPage(2));
        console.log("done??");
    })();
}
async function branchPage(pageNo) //implicitly gets branch from the current branch url
{
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
            getBranchByUser(this.responseText);
            //return true;
        }
    }
    let url = `https://bitbucket.org/!api/internal/repositories/${getCurrentRepo()}/branch-list/`
    +`?q=name != \"master\" AND (ahead > 0 OR ahead = null)`
    +`&page=${pageNo}`
    +`&pagelen=25`
    +`&fields=`
    +`-values.target.author.user.account_id,`
    +`+values.pullrequest.state,`
    +`+values.pullrequest.created_on,`
    +`+values.pullrequests.state,`
    +`+values.pullrequests.created_on,`
    +`+values.pullrequests.closed_on,`
    +`-values.statuses,`
    +`+values.default_merge_strategy,`
    +`+values.merge_strategies`;

    url = encodeURL(url);
    xhttp.open("GET", url);
    xhttp.send();
}
function encodeURL(url)
{
    let encoded = url;
    encoded = encoded.replace(/([+])/g,'%2B');
    encoded = encoded.replace(/([,])/g,'%2C');

    return encoded;
}
function addUI()
{
    $('div[role="search"]').parent().append(`
    <div id="userBranchDiv">
    </div>
    `);
    $(main).append(`<select id="userList"></select>`);
    $(main).append(`<input type="button" id="filter" value="Filter" style="padding:2px; margin-left:5px;"/>`);
    $(main).parent().parent().append(`<div id="filteredBranches"></div>`);

}
function getCurrentRepo()
{
    let url = window.location.href;
    url = url.replace('https://',''); //bitbucket.org/WORKSPACE/REPO/branches
    console.log(url);

    url = url.slice(url.indexOf('/')+1, url.length-1); //WORKSPACE/REPO/branches
    console.log(`repo and branches: ${url}`);
    url = url.replace(url.slice(url.lastIndexOf('/branches'),url.length),''); //WORKSPACE/REPO
    console.log(`workspace and repo: ${url}`);
    return url;
}
function getCurrentWorkspace()
{
    let url = getCurrentRepo(); //WORKSPACE/REPO
    url = url.slice(0, url.indexOf('/')); //WORKSPACE
    console.log(`workspace: ${url}`);
    return url;
}