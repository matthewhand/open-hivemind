async function get() {
    const res = await fetch(`https://api.github.com/repos/matthewhand/open-hivemind/issues?state=all`);
    if(res.ok) {
        const data = await res.json();
        console.log(data.map(i => i.title));
    } else {
        console.log(res.status);
    }
}
get();
