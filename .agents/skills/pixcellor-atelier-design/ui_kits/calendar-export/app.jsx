/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard */

function Post({ html }) {
  return (
    <div
      className="frame"
      style={{ width: 1080, height: 1350 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function App() {
  const posts = window.CAL_POSTS || [];
  return (
    <DesignCanvas
      title="7-Day Posts · PNG export"
      subtitle="Open the ⋯ menu on any post → Download PNG for an exact 1080×1350 image."
    >
      <DCSection id="week" title="The week" subtitle="Each artboard exports at full 1080×1350 resolution">
        {posts.map((p) => (
          <DCArtboard key={p.id} id={p.id} label={p.label} width={1080} height={1350}>
            <Post html={p.html} />
          </DCArtboard>
        ))}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
