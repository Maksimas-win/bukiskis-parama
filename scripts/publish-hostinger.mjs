// Run only after CI verifies that docs/ is the tested, committed build.
// Hostinger watches this branch; only public files are copied to its web root.
const repository = process.env.GITHUB_REPOSITORY;
const source = process.env.GITHUB_SHA;
const token = process.env.GH_TOKEN;
if (repository !== 'Maksimas-win/bukiskis-parama' || !/^[a-f0-9]{40}$/.test(source || '') || !token) {
  throw new Error('This publisher requires the expected repository, commit and CI token');
}
const branch = 'hostinger';
const base = `https://api.github.com/repos/${repository}`;
async function api(route, method = 'GET', body, allowMissing = false) {
  const response = await fetch(`${base}${route}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub publication failed: ${method} ${route} (${response.status})`);
  return response.json();
}
const commit = await api(`/git/commits/${source}`);
const tree = await api(`/git/trees/${commit.tree.sha}`);
const output = tree.tree.find(entry => entry.path === 'docs' && entry.type === 'tree');
if (!output) throw new Error('The tested commit has no docs tree');
const current = await api(`/git/ref/heads/${branch}`, 'GET', undefined, true);
if (current) {
  const previous = await api(`/git/commits/${current.object.sha}`);
  if (previous.tree.sha === output.sha) {
    console.log(`Hostinger already has the tested tree from ${source}`);
    process.exit(0);
  }
}
const release = await api('/git/commits', 'POST', {
  message: `Publish hram.lt from ${source}`,
  tree: output.sha, parents: current ? [current.object.sha] : [],
});
if (current) {
  // Fail instead of overwriting an unexpected concurrent release.
  await api(`/git/refs/heads/${branch}`, 'PATCH', {sha: release.sha, force: false});
} else {
  await api('/git/refs', 'POST', {ref: `refs/heads/${branch}`, sha: release.sha});
}
console.log(`Published static release ${release.sha} from ${source}; Hostinger will deploy it automatically.`);
