//Some boilerplate to run this in node & with CSSselect
var sinktest = require("sink-test"),
    sink = sinktest.sink,
    start = sinktest.start,
    DomUtils = require("htmlparser2").DomUtils,
    helper = require("../helper.js"),
    document = helper.getDOM(require("fs").readFileSync(__dirname + "/index.html")+""),
    window = {document:document},
    Q = function(query, doc){
    	if(typeof doc === "string") doc = Q(doc);
    	if(typeof query === "object"){
    		return Array.prototype.slice.call(arguments, 0);
    	}
    	if(typeof doc === "object" && !Array.isArray(doc)) doc = doc.children;
    	return helper.CSSselect(query, doc || document);
    };

Q.is = helper.CSSselect.is;
Q.pseudos = helper.CSSselect.pseudos;
Q.configure = function(){};
Q.uniq = function(arr){
	return arr.filter(function(e, i){
		return arr.indexOf(e) === i;
	});
};

//just assign these methods to Object.prototype, it's only for testing
Object.prototype.getElementById = function(id){
	return DomUtils.getElementById(id, this);
};
Object.prototype.getElementsByTagName = function(tag){
	return DomUtils.getElementsByTagName(tag, this);
};
Object.prototype.createElement = function(name){
	var obj = helper.getDOM("<" + name + ">");
	obj.__defineSetter__("innerHTML", function(data){
		obj[0].children = helper.getDOM(data);
	});
	return obj;
};
Object.prototype.getAttribute = function(name){
	return this.attrs && this.attrs[name];
};
Object.prototype.__defineGetter__("tagName", function(){ return this.name;});

var location = {};

//https://github.com/ded/qwery/blob/master/tests/tests.js
// silly custom pseudo just for tests
Q.pseudos.humanoid = function(e, v) { return Q.is(e, 'li:contains(human)') || Q.is(e, 'ol:contains(human)') }
var hasQSA = !!document.querySelectorAll
  , sinkSuite = function (label, suite) {
      sink(label + (hasQSA ? ' [qSA]' : ''), function () {
        hasQSA && Q.configure({ useNativeQSA: true })
        suite.apply(null, arguments)
      })
      hasQSA && sink(label + ' [non-QSA]', function () {
        Q.configure({ useNativeQSA: false })
        suite.apply(null, arguments)
      })
    }

sinkSuite('Contexts', function (test, ok, b, a, assert) {

  test('should be able to pass optional context', 2, function () {
    assert(Q('.a').length, 3, 'no context found 3 elements (.a)');
    assert(Q('.a', Q('#boosh')).length, 2, 'context found 2 elements (#boosh .a)');
  });

  test('should be able to pass string as context', 5, function() {
    assert(Q('.a', '#boosh').length, 2, 'context found 2 elements(.a, #boosh)');
    assert(Q('.a', '.a').length, 0, 'context found 0 elements(.a, .a)');
    assert(Q('.a', '.b').length, 1, 'context found 1 elements(.a, .b)');
    assert(Q('.a', '#boosh .b').length, 1, 'context found 1 elements(.a, #boosh .b)');
    assert(Q('.b', '#boosh .b').length, 0, 'context found 0 elements(.b, #boosh .b)');
  });

  test('should be able to pass qwery result as context', 5, function() {
    assert(Q('.a', Q('#boosh')).length, 2, 'context found 2 elements(.a, #boosh)');
    assert(Q('.a', Q('.a')).length, 0, 'context found 0 elements(.a, .a)');
    assert(Q('.a', Q('.b')).length, 1, 'context found 1 elements(.a, .b)');
    assert(Q('.a', Q('#boosh .b')).length, 1, 'context found 1 elements(.a, #boosh .b)');
    assert(Q('.b', Q('#boosh .b')).length, 0, 'context found 0 elements(.b, #boosh .b)');
  });

  test('should not return duplicates from combinators', 2, function () {
    assert(Q('#boosh,#boosh').length, 1, 'two booshes dont make a thing go right');
    assert(Q('#boosh,.apples,#boosh').length, 1, 'two booshes and an apple dont make a thing go right');
  });

  test('byId sub-queries within context', 6, function() {
    assert(Q('#booshTest', Q('#boosh')).length, 1, 'found "#id #id"')
    assert(Q('.a.b #booshTest', Q('#boosh')).length, 1, 'found ".class.class #id"')
    assert(Q('.a>#booshTest', Q('#boosh')).length, 1, 'found ".class>#id"')
    assert(Q('>.a>#booshTest', Q('#boosh')).length, 1, 'found ">.class>#id"')
    ok(!Q('#boosh', Q('#booshTest')).length, 'shouldn\'t find #boosh (ancestor) within #booshTest (descendent)')
    ok(!Q('#boosh', Q('#lonelyBoosh')).length, 'shouldn\'t find #boosh within #lonelyBoosh (unrelated)')
  })
})

sinkSuite('CSS 1', function (test, ok, b, a, assert) {
  test('get element by id', 2, function () {
    var result = Q('#boosh');
    ok(!!result[0], 'found element with id=boosh');
    ok(!!Q('h1')[0], 'found 1 h1');
  });

  test('byId sub-queries', 4, function() {
    assert(Q('#boosh #booshTest').length, 1, 'found "#id #id"')
    assert(Q('.a.b #booshTest').length, 1, 'found ".class.class #id"')
    assert(Q('#boosh>.a>#booshTest').length, 1, 'found "#id>.class>#id"')
    assert(Q('.a>#booshTest').length, 1, 'found ".class>#id"')
  })

  test('get elements by class', 6, function () {
    assert(Q('#boosh .a').length, 2, 'found two elements');
    ok(!!Q('#boosh div.a')[0], 'found one element');
    assert(Q('#boosh div').length, 2, 'found two {div} elements');
    ok(!!Q('#boosh span')[0], 'found one {span} element');
    ok(!!Q('#boosh div div')[0], 'found a single div');
    assert(Q('a.odd').length, 1, 'found single a');
  });

  test('combos', 1, function () {
    assert(Q('#boosh div,#boosh span').length, 3, 'found 2 divs and 1 span');
  });

  test('class with dashes', 1, function() {
    assert(Q('.class-with-dashes').length, 1, 'found something');
  });

  test('should ignore comment nodes', 1, function() {
    assert(Q('#boosh *').length, 4, 'found only 4 elements under #boosh')
  });

  test('deep messy relationships', 6, function() {
    // these are mostly characterised by a combination of tight relationships and loose relationships
    // on the right side of the query it's easy to find matches but they tighten up quickly as you
    // go to the left
    // they are useful for making sure the dom crawler doesn't stop short or over-extend as it works
    // up the tree the crawl needs to be comprehensive
    assert(Q('div#fixtures > div a').length, 5, 'found four results for "div#fixtures > div a"')
    assert(Q('.direct-descend > .direct-descend .lvl2').length, 1, 'found one result for ".direct-descend > .direct-descend .lvl2"')
    assert(Q('.direct-descend > .direct-descend div').length, 1, 'found one result for ".direct-descend > .direct-descend div"')
    assert(Q('.direct-descend > .direct-descend div').length, 1, 'found one result for ".direct-descend > .direct-descend div"')
    assert(Q('div#fixtures div ~ a div').length, 0, 'found no results for odd query')
    assert(Q('.direct-descend > .direct-descend > .direct-descend ~ .lvl2').length, 0, 'found no results for another odd query')
  });
});

sinkSuite('CSS 2', function (test, ok, b, a, assert) {

  test('get elements by attribute', 4, function () {
    var wanted = Q('#boosh div[test]')[0];
    var expected = document.getElementById('booshTest');
    ok(wanted == expected, 'found attribute');
    ok(Q('#boosh div[test=fg]')[0] == expected, 'found attribute with value');
    assert(Q('em[rel~="copyright"]').length, 1, 'found em[rel~="copyright"]');
    assert(Q('em[nopass~="copyright"]').length, 0, 'found em[nopass~="copyright"]');
  });

  test('should not throw error by attribute selector', 1, function () {
    assert(Q('[foo^="bar"]').length, 1, 'found 1 element');
  });

  test('crazy town', 1, function () {
    var el = document.getElementById('attr-test3');
    ok(Q('div#attr-test3.found.you[title="whatup duders"]')[0] == el, 'found the right element');
  });

});

sinkSuite('attribute selectors', function (test, ok, b, a, assert) {

  /* CSS 2 SPEC */

  test('[attr]', 1, function () {
    var expected = document.getElementById('attr-test-1');
    ok(Q('#attributes div[unique-test]')[0] == expected, 'found attribute with [attr]');
  });

  test('[attr=val]', 3, function () {
    var expected = document.getElementById('attr-test-2');
    ok(Q('#attributes div[test="two-foo"]')[0] == expected, 'found attribute with =');
    ok(Q("#attributes div[test='two-foo']")[0] == expected, 'found attribute with =');
    ok(Q('#attributes div[test=two-foo]')[0] == expected, 'found attribute with =');
  });

  test('[attr~=val]', 1, function () {
    var expected = document.getElementById('attr-test-3');
    ok(Q('#attributes div[test~=three]')[0] == expected, 'found attribute with ~=');
  });

  test('[attr|=val]', 2, function () {
    var expected = document.getElementById('attr-test-2');
    ok(Q('#attributes div[test|="two-foo"]')[0] == expected, 'found attribute with |=');
    ok(Q('#attributes div[test|=two]')[0] == expected, 'found attribute with |=');
  });

  test('[href=#x] special case', 1, function () {
    var expected = document.getElementById('attr-test-4');
    ok(Q('#attributes a[href="#aname"]')[0] == expected, 'found attribute with href=#x');
  });

  /* CSS 3 SPEC */

  test('[attr^=val]', 1, function () {
    var expected = document.getElementById('attr-test-2');
    ok(Q('#attributes div[test^=two]')[0] == expected, 'found attribute with ^=');
  });

  test('[attr$=val]', 1, function () {
    var expected = document.getElementById('attr-test-2');
    ok(Q('#attributes div[test$=foo]')[0] == expected, 'found attribute with $=');
  });

  test('[attr*=val]', 1, function () {
    var expected = document.getElementById('attr-test-3');
    ok(Q('#attributes div[test*=hree]')[0] == expected, 'found attribute with *=');
  });

  test('direct descendants', 2, function () {
    assert(Q('#direct-descend > .direct-descend').length, 2, 'found two direct descendents');
    assert(Q('#direct-descend > .direct-descend > .lvl2').length, 3, 'found three second-level direct descendents');
  });

  test('sibling elements', 17, function () {
    assert(Q('#sibling-selector ~ .sibling-selector').length, 2, 'found two siblings')
    assert(Q('#sibling-selector ~ div.sibling-selector').length, 2, 'found two siblings')
    assert(Q('#sibling-selector + div.sibling-selector').length, 1, 'found one sibling')
    assert(Q('#sibling-selector + .sibling-selector').length, 1, 'found one sibling')

    assert(Q('.parent .oldest ~ .sibling').length, 4, 'found four younger siblings')
    assert(Q('.parent .middle ~ .sibling').length, 2, 'found two younger siblings')
    assert(Q('.parent .middle ~ h4').length, 1, 'found next sibling by tag')
    assert(Q('.parent .middle ~ h4.younger').length, 1, 'found next sibling by tag and class')
    assert(Q('.parent .middle ~ h3').length, 0, 'an element can\'t be its own sibling')
    assert(Q('.parent .middle ~ h2').length, 0, 'didn\'t find an older sibling')
    assert(Q('.parent .youngest ~ .sibling').length, 0, 'found no younger siblings')

    assert(Q('.parent .oldest + .sibling').length, 1, 'found next sibling')
    assert(Q('.parent .middle + .sibling').length, 1, 'found next sibling')
    assert(Q('.parent .middle + h4').length, 1, 'found next sibling by tag')
    assert(Q('.parent .middle + h3').length, 0, 'an element can\'t be its own sibling')
    assert(Q('.parent .middle + h2').length, 0, 'didn\'t find an older sibling')
    assert(Q('.parent .youngest + .sibling').length, 0, 'found no younger siblings')
  });

});

sinkSuite('Uniq', function (test, ok, b, a, assert) {
  test('duplicates arent found in arrays', 2, function () {
    assert(Q.uniq(['a', 'b', 'c', 'd', 'e', 'a', 'b', 'c', 'd', 'e']).length, 5, 'result should be a, b, c, d, e')
    assert(Q.uniq(['a', 'b', 'c', 'c', 'c']).length, 3, 'result should be a, b, c')
  })
})


sinkSuite('element-context queries', function (test, ok, b, a, assert) {
  test('relationship-first queries', 5, function() {
    var pass = false
    try { pass = Q('> .direct-descend', Q('#direct-descend')).length == 2 } catch (e) { }
    ok(pass, 'found two direct descendents using > first');

    pass = false
    try { pass = Q('~ .sibling-selector', Q('#sibling-selector')).length == 2 } catch (e) { }
    ok(pass, 'found two siblings with ~ first')

    pass = false
    try { pass = Q('+ .sibling-selector', Q('#sibling-selector')).length == 1 } catch (e) { }
    ok(pass, 'found one sibling with + first')

    pass = false
    var ctx = Q('.idless')[0]
    try { pass = Q('> .tokens a', ctx).length == 1 } catch (e) { }
    ok(pass, 'found one sibling from a root with no id')
    ok(!ctx.getAttribute('id'), 'root element used for selection still has no id')
  })

  // should be able to query on an element that hasn't been inserted into the dom
  var frag = document.createElement('div')
  frag.innerHTML = '<div class="d i v"><p id="oooo"><em></em><em id="emem"></em></p></div><p id="sep"><div class="a"><span></span></div></p>'

  test('detached fragments', 2, function() {
    assert(Q('.a span', frag).length, 1, 'should find child elements of fragment')
    assert(Q('> div p em', frag).length, 2, 'should find child elements of fragment, relationship first')
  })

  test('byId sub-queries within detached fragment', 6, function () {
    assert(Q('#emem', frag).length, 1, 'found "#id" in fragment')
    assert(Q('.d.i #emem', frag).length, 1, 'found ".class.class #id" in fragment')
    assert(Q('.d #oooo #emem', frag).length, 1, 'found ".class #id #id" in fragment')
    assert(Q('> div #oooo', frag).length, 1, 'found "> .class #id" in fragment')
    ok(!Q('#oooo', Q('#emem', frag)).length, 'shouldn\'t find #oooo (ancestor) within #emem (descendent)')
    ok(!Q('#sep', Q('#emem', frag)).length, 'shouldn\'t find #sep within #emem (unrelated)')
  })

  test('exclude self in match', 1, function() {
    assert(Q('.order-matters', Q('#order-matters')).length, 4, 'should not include self in element-context queries')
  });

  // because form's have .length
  test('forms can be used as contexts', 1, function() {
    assert(Q('*', Q('form')[0]).length, 3, 'found 3 elements under &lt;form&gt;')
  })
})

sinkSuite('tokenizer', function (test, ok, b, a, assert) {

  test('should not get weird tokens', 5, function () {
    ok(Q('div .tokens[title="one"]')[0] == document.getElementById('token-one'), 'found div .tokens[title="one"]');
    ok(Q('div .tokens[title="one two"]')[0] == document.getElementById('token-two'), 'found div .tokens[title="one two"]');
    ok(Q('div .tokens[title="one two three #%"]')[0] == document.getElementById('token-three'), 'found div .tokens[title="one two three #%"]');
    ok(Q("div .tokens[title='one two three #%'] a")[0] == document.getElementById('token-four'), 'found div .tokens[title=\'one two three #%\'] a');
    ok(Q('div .tokens[title="one two three #%"] a[href$=foo] div')[0] == document.getElementById('token-five'), 'found div .tokens[title="one two three #%"] a[href=foo] div');
  });

});

sinkSuite('interesting syntaxes', function (test, ok, b, a, assert) {
  test('should parse bad selectors', 1, function () {
    ok(Q('#spaced-tokens    p    em    a').length, 'found element with funny tokens')
  });
});

sinkSuite('order matters', function (test, ok, b, a, assert) {

  function tag(el) {
    return el.tagName.toLowerCase();
  }

  // <div id="order-matters">
  //   <p class="order-matters"></p>
  //   <a class="order-matters">
  //     <em class="order-matters"></em><b class="order-matters"></b>
  //   </a>
  // </div>

  test('the order of elements return matters', 4, function () {
    var els = Q('#order-matters .order-matters');
    ok(tag(els[0]) == 'p', 'first element matched is a {p} tag');
    ok(tag(els[1]) == 'a', 'first element matched is a {a} tag');
    ok(tag(els[2]) == 'em', 'first element matched is a {em} tag');
    ok(tag(els[3]) == 'b', 'first element matched is a {b} tag');
  });

});

sinkSuite('pseudo-selectors', function (test, ok, b, a, assert) {
  test(':contains', 4, function() {
    assert(Q('li:contains(humans)').length, 1, 'found by "element:contains(text)"')
    assert(Q(':contains(humans)').length, 5, 'found by ":contains(text)", including all ancestors')
    // * is an important case, can cause weird errors
    assert(Q('*:contains(humans)').length, 5, 'found by "*:contains(text)", including all ancestors')
    assert(Q('ol:contains(humans)').length, 1, 'found by "ancestor:contains(text)"')
  })

  test(':not', 1, function() {
    assert(Q('.odd:not(div)').length, 1, 'found one .odd :not an &lt;a&gt;')
  })

  test(':first-child', 2, function () {
    ok(Q('#pseudos div:first-child')[0] == document.getElementById('pseudos').getElementsByTagName('*')[0], 'found first child')
    assert(Q('#pseudos div:first-child').length, 1, 'found only 1')
  });

  test(':last-child', 2, function () {
    var all = document.getElementById('pseudos').getElementsByTagName('div');
    ok(Q('#pseudos div:last-child')[0] == all[all.length - 1], 'found last child')
    assert(Q('#pseudos div:last-child').length, 1, 'found only 1')
  });

  test('ol > li[attr="boosh"]:last-child', 2, function () {
    var expected = document.getElementById('attr-child-boosh');
    assert(Q('ol > li[attr="boosh"]:last-child').length, 1, 'only 1 element found');
    ok(Q('ol > li[attr="boosh"]:last-child')[0] == expected, 'found correct element');
  });

  test(':nth-child(odd|even|x)', 4, function () {
    var second = document.getElementById('pseudos').getElementsByTagName('div')[1];
    assert(Q('#pseudos :nth-child(odd)').length, 4, 'found 4 odd elements');
    assert(Q('#pseudos div:nth-child(odd)').length, 3, 'found 3 odd elements with div tag');
    assert(Q('#pseudos div:nth-child(even)').length, 3, 'found 3 even elements with div tag');
    ok(Q('#pseudos div:nth-child(2)')[0] == second, 'found 2nd nth-child of pseudos');
  });

  test(':nth-child(expr)', 6, function () {
    var fifth = document.getElementById('pseudos').getElementsByTagName('a')[0];
    var sixth = document.getElementById('pseudos').getElementsByTagName('div')[4];

    assert(Q('#pseudos :nth-child(3n+1)').length, 3, 'found 3 elements');
    assert(Q('#pseudos :nth-child(3n-2)').length, 3, 'found 3 elements'); // was +3n-2 but older safari no likey +
    assert(Q('#pseudos :nth-child(-n+6)').length, 6, 'found 6 elements');
    assert(Q('#pseudos :nth-child(-n+5)').length, 5, 'found 5 elements');
    ok(Q('#pseudos :nth-child(3n+2)')[1] == fifth, 'second :nth-child(3n+2) is the fifth child');
    ok(Q('#pseudos :nth-child(3n)')[1] == sixth, 'second :nth-child(3n) is the sixth child');
  });

  test(':nth-last-child(odd|even|x)', 4, function () {
    var second = document.getElementById('pseudos').getElementsByTagName('div')[1];
    assert(Q('#pseudos :nth-last-child(odd)').length, 4, 'found 4 odd elements');
    assert(Q('#pseudos div:nth-last-child(odd)').length, 3, 'found 3 odd elements with div tag');
    assert(Q('#pseudos div:nth-last-child(even)').length, 3, 'found 3 even elements with div tag');
    ok(Q('#pseudos div:nth-last-child(6)')[0] == second, '6th nth-last-child should be 2nd of 7 elements');
  });

  test(':nth-last-child(expr)', 5, function () {
    var third = document.getElementById('pseudos').getElementsByTagName('div')[2];

    assert(Q('#pseudos :nth-last-child(3n+1)').length, 3, 'found 3 elements');
    assert(Q('#pseudos :nth-last-child(3n-2)').length, 3, 'found 3 elements');
    assert(Q('#pseudos :nth-last-child(-n+6)').length, 6, 'found 6 elements');
    assert(Q('#pseudos :nth-last-child(-n+5)').length, 5, 'found 5 elements');
    ok(Q('#pseudos :nth-last-child(3n+2)')[0] == third, 'first :nth-last-child(3n+2) is the third child');
  });

  test(':nth-of-type(expr)', 6, function () {
    var a = document.getElementById('pseudos').getElementsByTagName('a')[0];

    assert(Q('#pseudos div:nth-of-type(3n+1)').length, 2, 'found 2 div elements');
    assert(Q('#pseudos a:nth-of-type(3n+1)').length, 1, 'found 1 a element');
    ok(Q('#pseudos a:nth-of-type(3n+1)')[0] == a, 'found the right a element');
    assert(Q('#pseudos a:nth-of-type(3n)').length, 0, 'no matches for every third a');
    assert(Q('#pseudos a:nth-of-type(odd)').length, 1, 'found the odd a');
    assert(Q('#pseudos a:nth-of-type(1)').length, 1, 'found the first a');
  });

  test(':nth-last-of-type(expr)', 3, function () {
    var second = document.getElementById('pseudos').getElementsByTagName('div')[1];

    assert(Q('#pseudos div:nth-last-of-type(3n+1)').length, 2, 'found 2 div elements');
    assert(Q('#pseudos a:nth-last-of-type(3n+1)').length, 1, 'found 1 a element');
    ok(Q('#pseudos div:nth-last-of-type(5)')[0] == second, '5th nth-last-of-type should be 2nd of 7 elements');
  });

  test(':first-of-type', 2, function () {
    ok(Q('#pseudos a:first-of-type')[0] == document.getElementById('pseudos').getElementsByTagName('a')[0], 'found first a element')
    assert(Q('#pseudos a:first-of-type').length, 1, 'found only 1')
  });

  test(':last-of-type', 2, function () {
    var all = document.getElementById('pseudos').getElementsByTagName('div');
    ok(Q('#pseudos div:last-of-type')[0] == all[all.length - 1], 'found last div element')
    assert(Q('#pseudos div:last-of-type').length, 1, 'found only 1')
  });

  test(':only-of-type', 2, function () {
    ok(Q('#pseudos a:only-of-type')[0] == document.getElementById('pseudos').getElementsByTagName('a')[0], 'found the only a element')
    assert(Q('#pseudos a:first-of-type').length, 1, 'found only 1')
  });

  test(':target', 2, function () {
    location.hash = '';
    assert(Q('#pseudos:target').length, 0, '#pseudos is not the target');
    location.hash = '#pseudos';
    assert(Q('#pseudos:target').length, 1, 'now #pseudos is the target');
    location.hash = '';
  });

  test('custom pseudos', 1, function() {
    // :humanoid implemented just for testing purposes
    assert(Q(':humanoid').length, 2, 'selected using custom pseudo')
  });

});

sinkSuite('argument types', function (test, ok, b, a, assert) {

  test('should be able to pass in nodes as arguments', 5, function () {
    var el = document.getElementById('boosh');
    ok(Q(el)[0] == el, 'Q(el)[0] == el');
    ok(Q(el, 'body')[0] == el, "Q(el, 'body')[0] == el");
    ok(Q(el, document)[0] == el, "Q(el, document)[0] == el");
    ok(Q(window)[0] == window, 'Q(window)[0] == window');
    ok(Q(document)[0] == document, 'Q(document)[0] == document');
  });

  test('should be able to pass in an array of results as arguments', 5, function () {
    var el = document.getElementById('boosh');
    var result = Q([Q('#boosh'), Q(document), Q(window)]);
    assert(result.length, 3, '3 elements in the combined set');
    ok(result[0] == el, "result[0] == el");
    ok(result[1] == document, "result[0] == document");
    ok(result[2] == window, 'result[0] == window');
    assert(Q([Q('#pseudos div.odd'), Q('#pseudos div.even')]).length, 6, 'found all the odd and even divs');
  });

});

sinkSuite('is()', function (test, ok, b, a, assert) {
  var el = document.getElementById('attr-child-boosh');
  test('simple selectors', 9, function () {
    ok(Q.is(el, 'li'), 'tag');
    ok(Q.is(el, '*'), 'wildcard');
    ok(Q.is(el, '#attr-child-boosh'), '#id');
    ok(Q.is(el, '[attr]'), '[attr]');
    ok(Q.is(el, '[attr=boosh]'), '[attr=val]');
    ok(!Q.is(el, 'div'), 'wrong tag');
    ok(!Q.is(el, '#foo'), 'wrong #id');
    ok(!Q.is(el, '[foo]'), 'wrong [attr]');
    ok(!Q.is(el, '[attr=foo]'), 'wrong [attr=val]');
  });
  test('selector sequences', 2, function () {
    ok(Q.is(el, 'li#attr-child-boosh[attr=boosh]'), 'tag#id[attr=val]');
    ok(!Q.is(el, 'div#attr-child-boosh[attr=boosh]'), 'wrong tag#id[attr=val]');
  });
  test('selector sequences combinators', 7, function () {
    ok(Q.is(el, 'ol li'), 'tag tag');
    ok(Q.is(el, 'ol>li'), 'tag>tag');
    ok(Q.is(el, 'ol>li+li'), 'tab>tag+tag');
    ok(Q.is(el, 'ol#list li#attr-child-boosh[attr=boosh]'), 'tag#id tag#id[attr=val]');
    ok(!Q.is(el, 'ol#list>li#attr-child-boosh[attr=boosh]'), 'wrong tag#id>tag#id[attr=val]');
    ok(Q.is(el, 'ol ol li#attr-child-boosh[attr=boosh]'), 'tag tag tag#id[attr=val]');
    ok(Q.is(Q('#token-four')[0], 'div#fixtures>div a'), 'tag#id>tag tag where ambiguous middle tag requires backtracking');
  });
  test('pseudos', 4, function() {
    //TODO: more tests!
    ok(Q.is(el, 'li:contains(hello)'), 'matching :contains(text)')
    ok(!Q.is(el, 'li:contains(human)'), 'non-matching :contains(text)')
    ok(Q.is(Q('#list>li')[2], ':humanoid'), 'matching custom pseudo')
    ok(!Q.is(Q('#list>li')[1], ':humanoid'), 'non-matching custom pseudo')
  })
  test('context', 2, function () {
    ok(Q.is(el, 'li#attr-child-boosh[attr=boosh]', Q('#list')[0]), 'context');
    ok(!Q.is(el, 'ol#list li#attr-child-boosh[attr=boosh]', Q('#boosh')[0]), 'wrong context');
  });
});

sinkSuite('selecting elements in other documents', function (test, ok, b, a, assert) {
  var doc = helper.getDOM(
    '<div id="hsoob">' +
      '<div class="a b">' +
        '<div class="d e sib" test="fg" id="booshTest"><p><span id="spanny"></span></p></div>' +
        '<em nopass="copyrighters" rel="copyright booshrs" test="f g" class="sib"></em>' +
        '<span class="h i a sib"></span>' +
      '</div>' +
      '<p class="odd"></p>' +
    '</div>' +
    '<div id="lonelyHsoob"></div>'
  )

  test('get element by id', 1, function () {
    var result = Q('#hsoob', doc);
    ok(!!result[0], 'found element with id=hsoob');
  });

  test('get elements by class', 6, function () {
    assert(Q('#hsoob .a', doc).length, 2, 'found two elements');
    ok(!!Q('#hsoob div.a', doc)[0], 'found one element');
    assert(Q('#hsoob div', doc).length, 2, 'found two {div} elements');
    ok(!!Q('#hsoob span', doc)[0], 'found one {span} element');
    ok(!!Q('#hsoob div div', doc)[0], 'found a single div');
    assert(Q('p.odd', doc).length, 1, 'found single br');
  });

  test('complex selectors', 4, function () {
    assert(Q('.d ~ .sib', doc).length, 2, 'found one ~ sibling')
    assert(Q('.a .d + .sib', doc).length, 1, 'found 2 + siblings')
    assert(Q('#hsoob > div > .h', doc).length, 1, 'found span using child selectors')
    assert(Q('.a .d ~ .sib[test="f g"]', doc).length, 1, 'found 1 ~ sibling with test attribute')
  });

  test('byId sub-queries', 3, function () {
    assert(Q('#hsoob #spanny', doc).length, 1, 'found "#id #id" in frame')
    assert(Q('.a #spanny', doc).length, 1, 'found ".class #id" in frame')
    assert(Q('.a #booshTest #spanny', doc).length, 1, 'found ".class #id #id" in frame')
    //assert(Q('> #hsoob', doc).length, 1, 'found "> #id" in frame') --> would be good to support this, needs some tweaking though
  })

  test('byId sub-queries within sub-context', 6, function () {
    assert(Q('#spanny', Q('#hsoob', doc)).length, 1, 'found "#id -> #id" in frame')
    assert(Q('.a #spanny', Q('#hsoob', doc)).length, 1, 'found ".class #id" in frame')
    assert(Q('.a #booshTest #spanny', Q('#hsoob', doc)).length, 1, 'found ".class #id #id" in frame')
    assert(Q('.a > #booshTest', Q('#hsoob', doc)).length, 1, 'found "> .class #id" in frame')
    ok(!Q('#booshTest', Q('#spanny', doc)).length, 'shouldn\'t find #booshTest (ancestor) within #spanny (descendent)')
    ok(!Q('#booshTest', Q('#lonelyHsoob', doc)).length, 'shouldn\'t find #booshTest within #lonelyHsoob (unrelated)')
  })

});

start();