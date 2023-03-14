async function test() {
  return new Promise((resolve) => setTimeout(resolve, 1000)).then(
    () => 'fdafas'
  );
}

async function main() {
  console.log(await test());

  console.log('after');
}

main();
