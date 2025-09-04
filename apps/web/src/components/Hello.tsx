export default function Hello({ name = 'World' }: { name?: string }) {
  return <div role="heading">Hello {name}</div>
}
