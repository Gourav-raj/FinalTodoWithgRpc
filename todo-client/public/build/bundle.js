
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/Todoitem.svelte generated by Svelte v3.20.1 */
    const file = "src/Todoitem.svelte";

    function create_fragment(ctx) {
    	let div4;
    	let div2;
    	let input;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let div1;
    	let t3;
    	let div2_tansition_fly_value;
    	let t4;
    	let div3;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div2 = element("div");
    			input = element("input");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(/*title*/ ctx[1]);
    			t2 = space();
    			div1 = element("div");
    			t3 = text(/*date*/ ctx[2]);
    			t4 = space();
    			div3 = element("div");
    			div3.textContent = "x";
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file, 62, 4, 1145);
    			attr_dev(div0, "class", "todo-item-label svelte-1061ct2");
    			toggle_class(div0, "completed", /*completed*/ ctx[0]);
    			add_location(div0, file, 63, 4, 1225);
    			attr_dev(div1, "class", "todo-item-date svelte-1061ct2");
    			add_location(div1, file, 65, 4, 1305);
    			attr_dev(div2, "class", "todo-item-left svelte-1061ct2");
    			attr_dev(div2, "tansition:fly", div2_tansition_fly_value = { y: 20, duration: 300 });
    			add_location(div2, file, 61, 1, 1073);
    			attr_dev(div3, "class", "remove-item svelte-1061ct2");
    			add_location(div3, file, 68, 1, 1440);
    			attr_dev(div4, "class", "todo-item svelte-1061ct2");
    			add_location(div4, file, 60, 0, 1048);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div2);
    			append_dev(div2, input);
    			input.checked = /*completed*/ ctx[0];
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, t3);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "change", /*input_change_handler*/ ctx[7]),
    				listen_dev(input, "change", /*toggleComplete*/ ctx[4], false, false, false),
    				listen_dev(div3, "click", /*deleteTodo*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*completed*/ 1) {
    				input.checked = /*completed*/ ctx[0];
    			}

    			if (dirty & /*title*/ 2) set_data_dev(t1, /*title*/ ctx[1]);

    			if (dirty & /*completed*/ 1) {
    				toggle_class(div0, "completed", /*completed*/ ctx[0]);
    			}

    			if (dirty & /*date*/ 4) set_data_dev(t3, /*date*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { id } = $$props;
    	let { title } = $$props;
    	let { completed } = $$props;
    	let { date } = $$props;
    	const dispatch = createEventDispatcher();

    	function deleteTodo() {
    		dispatch("deleteTodo", { id });
    	}

    	function toggleComplete() {
    		dispatch("toggleComplete", { id });
    	}

    	const writable_props = ["id", "title", "completed", "date"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Todoitem> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Todoitem", $$slots, []);

    	function input_change_handler() {
    		completed = this.checked;
    		$$invalidate(0, completed);
    	}

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(5, id = $$props.id);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("completed" in $$props) $$invalidate(0, completed = $$props.completed);
    		if ("date" in $$props) $$invalidate(2, date = $$props.date);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		fly,
    		id,
    		title,
    		completed,
    		date,
    		dispatch,
    		deleteTodo,
    		toggleComplete
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(5, id = $$props.id);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("completed" in $$props) $$invalidate(0, completed = $$props.completed);
    		if ("date" in $$props) $$invalidate(2, date = $$props.date);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		completed,
    		title,
    		date,
    		deleteTodo,
    		toggleComplete,
    		id,
    		dispatch,
    		input_change_handler
    	];
    }

    class Todoitem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { id: 5, title: 1, completed: 0, date: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todoitem",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[5] === undefined && !("id" in props)) {
    			console.warn("<Todoitem> was created without expected prop 'id'");
    		}

    		if (/*title*/ ctx[1] === undefined && !("title" in props)) {
    			console.warn("<Todoitem> was created without expected prop 'title'");
    		}

    		if (/*completed*/ ctx[0] === undefined && !("completed" in props)) {
    			console.warn("<Todoitem> was created without expected prop 'completed'");
    		}

    		if (/*date*/ ctx[2] === undefined && !("date" in props)) {
    			console.warn("<Todoitem> was created without expected prop 'date'");
    		}
    	}

    	get id() {
    		throw new Error("<Todoitem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Todoitem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Todoitem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Todoitem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get completed() {
    		throw new Error("<Todoitem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set completed(value) {
    		throw new Error("<Todoitem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get date() {
    		throw new Error("<Todoitem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set date(value) {
    		throw new Error("<Todoitem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Todos.svelte generated by Svelte v3.20.1 */
    const file$1 = "src/Todos.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (128:5) {#each filteredTodos as todo }
    function create_each_block(ctx) {
    	let div;
    	let current;
    	const todoitem_spread_levels = [/*todo*/ ctx[16]];
    	let todoitem_props = {};

    	for (let i = 0; i < todoitem_spread_levels.length; i += 1) {
    		todoitem_props = assign(todoitem_props, todoitem_spread_levels[i]);
    	}

    	const todoitem = new Todoitem({ props: todoitem_props, $$inline: true });
    	todoitem.$on("deleteTodo", /*handleDeleteTodo*/ ctx[8]);
    	todoitem.$on("toggleComplete", /*handleToggleComplete*/ ctx[9]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(todoitem.$$.fragment);
    			attr_dev(div, "class", "todo-item");
    			add_location(div, file$1, 128, 7, 2968);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(todoitem, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const todoitem_changes = (dirty & /*filteredTodos*/ 8)
    			? get_spread_update(todoitem_spread_levels, [get_spread_object(/*todo*/ ctx[16])])
    			: {};

    			todoitem.$set(todoitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todoitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todoitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(todoitem);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(128:5) {#each filteredTodos as todo }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div6;
    	let h2;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;
    	let input0;
    	let t3;
    	let t4;
    	let div2;
    	let div0;
    	let lable;
    	let input1;
    	let t5;
    	let t6;
    	let div1;
    	let t7;
    	let t8;
    	let t9;
    	let div5;
    	let div3;
    	let button0;
    	let t11;
    	let button1;
    	let t13;
    	let button2;
    	let t15;
    	let div4;
    	let button3;
    	let current;
    	let dispose;
    	let each_value = /*filteredTodos*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Svelte TODO App";
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			input0 = element("input");
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			div2 = element("div");
    			div0 = element("div");
    			lable = element("lable");
    			input1 = element("input");
    			t5 = text("Check All");
    			t6 = space();
    			div1 = element("div");
    			t7 = text(/*todosRemaining*/ ctx[2]);
    			t8 = text(" items left");
    			t9 = space();
    			div5 = element("div");
    			div3 = element("div");
    			button0 = element("button");
    			button0.textContent = "All";
    			t11 = space();
    			button1 = element("button");
    			button1.textContent = "Active";
    			t13 = space();
    			button2 = element("button");
    			button2.textContent = "Completed";
    			t15 = space();
    			div4 = element("div");
    			button3 = element("button");
    			button3.textContent = "Clear Completed";
    			attr_dev(h2, "class", "heading");
    			attr_dev(h2, "margin", "auto");
    			attr_dev(h2, "align", "center");
    			add_location(h2, file$1, 122, 6, 2665);
    			if (img.src !== (img_src_value = "/img/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "LOGO");
    			attr_dev(img, "class", "logo svelte-1t6l36a");
    			add_location(img, file$1, 123, 5, 2740);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "todo-input svelte-1t6l36a");
    			attr_dev(input0, "placeholder", "Insert todo item ...");
    			add_location(input0, file$1, 125, 5, 2802);
    			attr_dev(input1, "class", "inner-container-input svelte-1t6l36a");
    			attr_dev(input1, "type", "checkbox");
    			add_location(input1, file$1, 136, 6, 3186);
    			add_location(lable, file$1, 135, 11, 3172);
    			add_location(div0, file$1, 135, 6, 3167);
    			add_location(div1, file$1, 139, 6, 3309);
    			attr_dev(div2, "class", "inner-container svelte-1t6l36a");
    			add_location(div2, file$1, 134, 6, 3131);
    			attr_dev(button0, "class", "svelte-1t6l36a");
    			toggle_class(button0, "active", /*currentFilter*/ ctx[1] === "all");
    			add_location(button0, file$1, 144, 12, 3426);
    			attr_dev(button1, "class", "svelte-1t6l36a");
    			toggle_class(button1, "active", /*currentFilter*/ ctx[1] === "active");
    			add_location(button1, file$1, 145, 7, 3532);
    			attr_dev(button2, "class", "svelte-1t6l36a");
    			toggle_class(button2, "active", /*currentFilter*/ ctx[1] === "completed");
    			add_location(button2, file$1, 146, 7, 3647);
    			add_location(div3, file$1, 144, 7, 3421);
    			attr_dev(button3, "class", "svelte-1t6l36a");
    			add_location(button3, file$1, 150, 7, 3806);
    			add_location(div4, file$1, 149, 7, 3793);
    			attr_dev(div5, "class", "inner-container svelte-1t6l36a");
    			add_location(div5, file$1, 143, 7, 3384);
    			attr_dev(div6, "class", "container svelte-1t6l36a");
    			add_location(div6, file$1, 121, 0, 2635);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, h2);
    			append_dev(div6, t1);
    			append_dev(div6, img);
    			append_dev(div6, t2);
    			append_dev(div6, input0);
    			set_input_value(input0, /*newTodoTitle*/ ctx[0]);
    			append_dev(div6, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}

    			append_dev(div6, t4);
    			append_dev(div6, div2);
    			append_dev(div2, div0);
    			append_dev(div0, lable);
    			append_dev(lable, input1);
    			append_dev(lable, t5);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, t7);
    			append_dev(div1, t8);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, button0);
    			append_dev(div3, t11);
    			append_dev(div3, button1);
    			append_dev(div3, t13);
    			append_dev(div3, button2);
    			append_dev(div5, t15);
    			append_dev(div5, div4);
    			append_dev(div4, button3);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[12]),
    				listen_dev(input0, "keydown", /*addTodo*/ ctx[4], false, false, false),
    				listen_dev(input1, "change", /*checkAllTodos*/ ctx[5], false, false, false),
    				listen_dev(button0, "click", /*click_handler*/ ctx[13], false, false, false),
    				listen_dev(button1, "click", /*click_handler_1*/ ctx[14], false, false, false),
    				listen_dev(button2, "click", /*click_handler_2*/ ctx[15], false, false, false),
    				listen_dev(button3, "click", /*clearCompleted*/ ctx[7], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*newTodoTitle*/ 1 && input0.value !== /*newTodoTitle*/ ctx[0]) {
    				set_input_value(input0, /*newTodoTitle*/ ctx[0]);
    			}

    			if (dirty & /*filteredTodos, handleDeleteTodo, handleToggleComplete*/ 776) {
    				each_value = /*filteredTodos*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div6, t4);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*todosRemaining*/ 4) set_data_dev(t7, /*todosRemaining*/ ctx[2]);

    			if (dirty & /*currentFilter*/ 2) {
    				toggle_class(button0, "active", /*currentFilter*/ ctx[1] === "all");
    			}

    			if (dirty & /*currentFilter*/ 2) {
    				toggle_class(button1, "active", /*currentFilter*/ ctx[1] === "active");
    			}

    			if (dirty & /*currentFilter*/ 2) {
    				toggle_class(button2, "active", /*currentFilter*/ ctx[1] === "completed");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let newTodoTitle = "";
    	let currentFilter = "all";
    	let nextId = 4;

    	let todos = [
    		{
    			id: 1,
    			title: "Mytodo",
    			date: "21/01/20",
    			completed: false
    		},
    		{
    			id: 2,
    			title: "Mytodo two",
    			date: "21/01/20",
    			completed: false
    		},
    		{
    			id: 3,
    			title: "Mytodo three",
    			date: "21/01/20",
    			completed: false
    		}
    	];

    	function addTodo(event) {
    		if (event.key === "Enter") {
    			$$invalidate(11, todos = [
    				...todos,
    				{
    					id: nextId,
    					completed: false,
    					title: newTodoTitle
    				}
    			]);

    			nextId = nextId + 1;
    			$$invalidate(0, newTodoTitle = "");
    		}
    	}

    	function checkAllTodos(event) {
    		todos.forEach(todo => todo.completed = event.target.checked);
    		$$invalidate(11, todos);
    	}

    	function updateFilter(newFilter) {
    		$$invalidate(1, currentFilter = newFilter);
    	}

    	function clearCompleted() {
    		$$invalidate(11, todos = todos.filter(todo => !todo.completed));
    	}

    	function handleDeleteTodo(event) {
    		$$invalidate(11, todos = todos.filter(todo => todo.id !== event.detail.id));
    	}

    	function handleToggleComplete(event) {
    		const todoIndex = todos.findIndex(todo => todo.id === event.detail.id);

    		const upadtedTodo = {
    			...todos[todoIndex],
    			completed: !todos[todoIndex].completed
    		};

    		$$invalidate(11, todos = [...todos.slice(0, todoIndex), upadtedTodo, ...todos.slice(todoIndex + 1)]);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Todos> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Todos", $$slots, []);

    	function input0_input_handler() {
    		newTodoTitle = this.value;
    		$$invalidate(0, newTodoTitle);
    	}

    	const click_handler = () => updateFilter("all");
    	const click_handler_1 = () => updateFilter("active");
    	const click_handler_2 = () => updateFilter("completed");

    	$$self.$capture_state = () => ({
    		TodoItem: Todoitem,
    		newTodoTitle,
    		currentFilter,
    		nextId,
    		todos,
    		addTodo,
    		checkAllTodos,
    		updateFilter,
    		clearCompleted,
    		handleDeleteTodo,
    		handleToggleComplete,
    		todosRemaining,
    		filteredTodos
    	});

    	$$self.$inject_state = $$props => {
    		if ("newTodoTitle" in $$props) $$invalidate(0, newTodoTitle = $$props.newTodoTitle);
    		if ("currentFilter" in $$props) $$invalidate(1, currentFilter = $$props.currentFilter);
    		if ("nextId" in $$props) nextId = $$props.nextId;
    		if ("todos" in $$props) $$invalidate(11, todos = $$props.todos);
    		if ("todosRemaining" in $$props) $$invalidate(2, todosRemaining = $$props.todosRemaining);
    		if ("filteredTodos" in $$props) $$invalidate(3, filteredTodos = $$props.filteredTodos);
    	};

    	let todosRemaining;
    	let filteredTodos;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentFilter, todos*/ 2050) {
    			 $$invalidate(3, filteredTodos = currentFilter === "all"
    			? todos
    			: currentFilter === "completed"
    				? todos.filter(todo => todo.completed)
    				: todos.filter(todo => !todo.completed));
    		}

    		if ($$self.$$.dirty & /*filteredTodos*/ 8) {
    			 $$invalidate(2, todosRemaining = filteredTodos.filter(todo => !todo.completed).length);
    		}
    	};

    	return [
    		newTodoTitle,
    		currentFilter,
    		todosRemaining,
    		filteredTodos,
    		addTodo,
    		checkAllTodos,
    		updateFilter,
    		clearCompleted,
    		handleDeleteTodo,
    		handleToggleComplete,
    		nextId,
    		todos,
    		input0_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Todos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todos",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.20.1 */

    function create_fragment$2(ctx) {
    	let current;
    	const todos = new Todos({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(todos.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(todos, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todos.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todos.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(todos, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Todos });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map