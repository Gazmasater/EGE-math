
var t3_child_wnd;
var t3_md_auto;
function open_win(url,wd,hg,wndname,showmenu)
	{
		if (t3_md_auto && !url.match(/\bmd=/))
			url += (url.indexOf('?')>=0?"&":"?")+"md="+t3_md_auto;
		if (!wndname) wndname='blank';
		t3_child_wnd=window.open(url,wndname,(showmenu?'menubar=1,':'')+'status=0,scrollbars=1,resizable=1,width='+wd+',height='+hg+',left='+(screen.width-wd)/2+',top='+(screen.height-hg)/2);
		t3_child_wnd.focus();
	}

function getCharCode(ch)
{
var A='À';
if (ch=='¨')
	return 0xA8;
else
if (ch=='¸')
	return 0xB8;
else
if (ch>='À' && ch<='ÿ')
	return (ch.charCodeAt(0)-A.charCodeAt(0)+0xC0);
else
	return ch.charCodeAt(0);
}


function urlencode(plaintext, isURL)
{
	var SAFECHARS = "0123456789" +					// Numeric
					"ABCDEFGHIJKLMNOPQRSTUVWXYZ" +	// Alphabetic
					"abcdefghijklmnopqrstuvwxyz" +
					"-_.!~*'()";					// RFC2396 Mark characters
	if (isURL)
		SAFECHARS += "?&=/:";
	var HEX = "0123456789ABCDEF";

	var encoded = "";
	for (var i = 0; i < plaintext.length; i++ ) {
		var ch = plaintext.charAt(i);
	    if (ch == " ") {
		    encoded += "+";
		} else if (SAFECHARS.indexOf(ch) != -1) {
		    encoded += ch;
		} else {
		    var charCode = getCharCode(ch);
			encoded += "%";
			encoded += HEX.charAt((charCode >> 4) & 0xF);
			encoded += HEX.charAt(charCode & 0xF);
		}
	}
	return encoded;
}

function createAJAXRequest()
{
var request = false;

try {
    request = new XMLHttpRequest();
} catch (trymicrosoft) {
    try {
        request = new ActiveXObject('Msxml2.XMLHTTP');
    } catch (othermicrosoft) {
        try {
            request = new ActiveXObject('Microsoft.XMLHTTP');
        } catch (failed) {
            request = false;
        }
    }
}

return request;
}

var loading_block;
function showLoading(noshd)
{	if (loading_block)
		loading_block.style.display='';
	if (navigator.userAgent.toLowerCase().indexOf('msie') != -1)
	{
		document.body.innerHTML = "";
		loading_block=document.createElement('DIV');
		loading_block.style.position='absolute';
		loading_block.style.top='0';
		loading_block.style.left='0';
		loading_block.style.width='100%';
		loading_block.style.height='100%';


			var loading_shadow=document.createElement('DIV');
			loading_block.appendChild(loading_shadow);
			loading_shadow.style.width='100%';
			loading_shadow.style.height='100%';
		if (!noshd) {
			loading_shadow.style.backgroundColor='#fff';
			loading_shadow.style.opacity='0.9';
		}

		var loading_img=document.createElement('IMG');
		loading_block.appendChild(loading_img);
		loading_img.src=home_directory+'images/aloader.gif';
		loading_img.style.position='absolute';
		loading_img.style.top='50%';
		loading_img.style.left='50%';
		loading_img.style.margin='-8px 0 0 -8px';
	}
	else
	{
		loading_block=document.createElement('DIV');
		loading_block.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh";

		var loading_shadow=document.createElement('DIV');
		loading_block.appendChild(loading_shadow);
		loading_shadow.style = "width:100vw; height: 100vh;"+(!noshd?"background: #fff; opacity: 0.9":"");

		var loading_img=document.createElement('IMG');
		loading_block.appendChild(loading_img);
		loading_img.src=home_directory+'images/aloader.gif';
		loading_img.style = "position: absolute; top: 50vh; left: 50vw; margin: -8px 0 0 -8px";
	}	document.body.appendChild(loading_block);
}

function hideLoading()
{	if (loading_block)
		loading_block.style.display='none';}

function classList_contains(e, c)
{	var expr = new RegExp("\\b"+c+"\\b", 'i');
	return e.className.match(expr);
}

function classList_add(e, c)
{
	if (!classList_contains(e, c))
		e.className += " "+c;
}

function classList_remove(e, c)
{
	var expr = new RegExp("\\b"+c+"\\b", 'ig');
	e.className = e.className.replace(expr).replace(/\s\s+/g," ").replace(/^\s+|\s+$/g,"");
}

function classList_toggle(e, c)
{
	if (!classList_contains(e, c))
		classList_add(e, c);
	else
		classList_remove(e, c);
}


function refreshFrame(name)
{
	window.parent.document.getElementById(name).contentDocument.location.reload();}