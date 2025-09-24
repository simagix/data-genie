// Redact credentials in a Mongo URI
function redactMongoUri(uri) {
  // Replace user:pass@ with ***:***@
  return uri.replace(/([\w%]+):([^@]+)@/, '***:***@');
}

import React, { useEffect, useState } from 'react';
function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const selectedProjectObj = projects.find(p => p.name === selectedProject);

  // Prompt state
  const [prompt, setPrompt] = useState('');
  const [promptStatus, setPromptStatus] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  // Load prompt when project changes
  useEffect(() => {
    if (selectedProjectObj && selectedProjectObj.config && selectedProjectObj.config.prompt !== undefined) {
      setPrompt(selectedProjectObj.config.prompt);
    } else {
      setPrompt('');
    }
    setPromptStatus('');
  }, [selectedProjectObj]);
  const [sampleDocs, setSampleDocs] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [sampleError, setSampleError] = useState('');

  // Add Project panel state (restored)
  const [newProjectName, setNewProjectName] = useState('');
  const [newMongoUri, setNewMongoUri] = useState('');
  const [newCollection, setNewCollection] = useState('');
  const [newPipeline, setNewPipeline] = useState('');
  const [addStatus, setAddStatus] = useState('');

  // Edit Project panel state
  const [showAddPanel, setShowAddPanel] = useState(false); // Always start as false
  const [showEditPanel, setShowEditPanel] = useState(false); // Always start as false
  const [editProjectName, setEditProjectName] = useState('');
  const [editMongoUri, setEditMongoUri] = useState('');
  const [editCollection, setEditCollection] = useState('');
  const [editPipeline, setEditPipeline] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // LLM results state per doc
  const [llmResults, setLlmResults] = useState([]);
  const [llmLoading, setLlmLoading] = useState([]);
  const [llmError, setLlmError] = useState([]);

  // Pipeline Assistant modal state
  const [showPipelineAssistant, setShowPipelineAssistant] = useState(false);
  const [pipelineAssistantText, setPipelineAssistantText] = useState('');
  const [pipelineAssistantStatus, setPipelineAssistantStatus] = useState('');
  // Fetch sample docs when selectedProjectObj changes
  useEffect(() => {
    async function fetchSamples() {
      if (!selectedProjectObj) {
        setSampleDocs([]);
        setSampleError('');
        setLlmResults([]);
        setLlmLoading([]);
        setLlmError([]);
        return;
      }
      setLoadingSamples(true);
      setSampleError('');
      try {
  const response = await fetch('http://127.0.0.1:5000/api/sample_docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mongo_uri: selectedProjectObj.config.mongo_uri,
            collection: selectedProjectObj.config.collection,
            pipeline: selectedProjectObj.config.pipeline,
            limit: 3
          })
        });
        const result = await response.json();
        if (result.docs && Array.isArray(result.docs) && result.docs.length > 0) {
          setSampleDocs(result.docs);
          setLlmResults(Array(result.docs.length).fill(null));
          setLlmLoading(Array(result.docs.length).fill(false));
          setLlmError(Array(result.docs.length).fill(''));
          // Only evaluate if prompt is defined and non-empty
          if (selectedProjectObj.config.prompt && selectedProjectObj.config.prompt.trim() !== '') {
            setLlmLoading(Array(result.docs.length).fill(true));
            result.docs.forEach(async (doc, idx) => {
              try {
                const response = await fetch('http://127.0.0.1:5000/api/process_llm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    prompt: selectedProjectObj.config.prompt,
                    doc: doc
                  })
                });
                const llmResult = await response.json();
                setLlmResults(prev => {
                  const arr = [...prev];
                  arr[idx] = llmResult.llm_result || '(No result)';
                  return arr;
                });
              } catch (err) {
                setLlmError(prev => {
                  const arr = [...prev];
                  arr[idx] = 'Error processing LLM.';
                  return arr;
                });
              }
              setLlmLoading(prev => {
                const arr = [...prev];
                arr[idx] = false;
                return arr;
              });
            });
          }
        } else {
          setSampleDocs([]);
          setSampleError('No sample documents found.');
          setLlmResults([]);
          setLlmLoading([]);
          setLlmError([]);
        }
      } catch (err) {
        setSampleDocs([]);
        setSampleError('Error loading sample documents.');
        setLlmResults([]);
        setLlmLoading([]);
        setLlmError([]);
      }
      setLoadingSamples(false);
    }
    fetchSamples();
  }, [selectedProjectObj]);

  useEffect(() => {
    async function fetchProjects() {
      try {
  const response = await fetch('http://127.0.0.1:5000/api/load_configs');
        const result = await response.json();
        if (result.configs && result.configs.length > 0) {
          setProjects(result.configs);
          setSelectedProject(result.configs[0].name);
        } else {
          setProjects([]);
          setSelectedProject('');
        }
      } catch (err) {
        setProjects([]);
        setSelectedProject('');
      }
    }
    fetchProjects();
  }, []);

  return (
    <div className="App" style={{ minHeight: '100vh', background: '#fff', padding: '40px' }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 40, height: '100%' }}>
        {/* Left column: Menu, project info, pipeline */}
  <div style={{ width: 340, minWidth: 0, maxWidth: 340, background: '#f7f7f7', borderRadius: 16, padding: '32px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', minHeight: 600, overflow: 'hidden' }}>
          <div style={{ fontWeight: 'bold', fontSize: 28, marginBottom: 18, textAlign: 'center', color: '#1976d2', letterSpacing: 1 }}>Data Genie</div>
          <label htmlFor="project-select" style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, display: 'block' }}>Projects</label>
          <select
            id="project-select"
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{ width: '100%', padding: '10px', fontSize: 16 }}
          >
            {projects.length === 0 && <option value="">No projects found</option>}
            {projects.map(project => (
              <option key={project.name} value={project.name}>{project.name}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              style={{ padding: '10px 18px', fontSize: 16, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => setShowAddPanel(true)}
            >
              Add Project
            </button>
            {selectedProjectObj && (
              <button
                style={{ padding: '10px 18px', fontSize: 16, background: '#ffa726', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                onClick={() => {
                  setEditProjectName(selectedProjectObj.name);
                  setEditMongoUri(selectedProjectObj.config.mongo_uri);
                  setEditCollection(selectedProjectObj.config.collection);
                  setEditPipeline(JSON.stringify(selectedProjectObj.config.pipeline, null, 2));
                  setShowEditPanel(true);
                  setEditStatus('');
                }}
              >
                Edit Project
              </button>
            )}
          </div>
          {/* Project details & prompt */}
          {selectedProjectObj && (
            <div style={{ marginTop: 32, background: '#fff', borderRadius: 8, padding: 18, fontFamily: 'monospace', fontSize: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ marginBottom: 10 }}><strong>MongoDB URI:</strong> {(() => {
                const uri = selectedProjectObj.config.mongo_uri || '';
                // Redact user:password in URI
                return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:@]+:[^@]+@)/, '$1****:****@');
              })()}</div>
              <div style={{ marginBottom: 10 }}><strong>Collection:</strong> {selectedProjectObj.config.collection}</div>
              {/* Aggregation Pipeline under project info */}
              <div style={{ marginTop: 24 }}>
                <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Aggregation Pipeline</div>
                <div style={{ background: '#f5faff', border: '2px solid #90caf9', borderRadius: 10, padding: 12, minHeight: 80, maxHeight: 200, fontSize: 14, fontFamily: 'monospace', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  <pre style={{ margin: 0, fontSize: 14 }}>
                    {JSON.stringify(selectedProjectObj.config.pipeline, null, 2)}
                  </pre>
                </div>
                <button
                  style={{ marginTop: 12, padding: '10px 18px', fontSize: 15, background: '#388e3c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'normal', display: 'block' }}
                  onClick={() => {
                    // Pre-fill with last pipeline_nl if available
                    if (selectedProjectObj && selectedProjectObj.config && selectedProjectObj.config.pipeline_nl) {
                      setPipelineAssistantText(selectedProjectObj.config.pipeline_nl);
                    } else {
                      setPipelineAssistantText('');
                    }
                    setShowPipelineAssistant(true);
                  }}
                >
                  Pipeline Assistant
                </button>
                {showPipelineAssistant && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                  }}>
                    <div style={{
                      background: '#fff',
                      padding: 48,
                      borderRadius: 16,
                      boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                      minWidth: 700,
                      maxWidth: 900,
                      minHeight: 400,
                      maxHeight: 700,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start'
                    }}>
                      <h2 style={{ marginBottom: 32, fontSize: 28 }}>Pipeline Assistant</h2>
                      <textarea
                        value={pipelineAssistantText}
                        onChange={e => setPipelineAssistantText(e.target.value)}
                        style={{ width: '100%', minHeight: 120, maxHeight: 300, padding: 16, fontSize: 17, fontFamily: 'monospace', resize: 'vertical', borderRadius: 8, border: '1.5px solid #90caf9' }}
                        placeholder="Describe your pipeline in natural language..."
                        wrap="soft"
                      />
                      <div style={{ color: pipelineAssistantStatus.startsWith('Error') ? 'red' : '#388e3c', marginTop: 18, fontSize: 16, minHeight: 24 }}>
                        {pipelineAssistantStatus}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 32 }}>
                        <button
                          style={{ padding: '10px 24px', fontSize: 16, background: '#aaa', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          onClick={() => {
                            setShowPipelineAssistant(false);
                            setPipelineAssistantStatus('');
                            setPipelineAssistantText('');
                          }}
                        >Cancel</button>
                        <button
                          style={{ padding: '10px 24px', fontSize: 16, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          onClick={async () => {
                            if (!pipelineAssistantText.trim()) {
                              setPipelineAssistantStatus('Error: Please enter a description.');
                              return;
                            }
                            setPipelineAssistantStatus('Translating...');
                            try {
                              const response = await fetch('http://127.0.0.1:5000/api/process_pipeline_llm', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  description: pipelineAssistantText
                                })
                              });
                              const result = await response.json();
                              if (result.pipeline) {
                                // Paste pipeline into editPipeline textarea and open Edit Project panel
                                setEditPipeline(JSON.stringify(result.pipeline, null, 2));
                                setShowPipelineAssistant(false);
                                setPipelineAssistantStatus('');
                                setPipelineAssistantText('');
                                setEditProjectName(selectedProjectObj.name);
                                setEditMongoUri(selectedProjectObj.config.mongo_uri);
                                setEditCollection(selectedProjectObj.config.collection);
                                // Save the NL description to config for review
                                setShowEditPanel(true);
                                setEditStatus('');
                                // Also set pipeline_nl for later save
                                selectedProjectObj.config.pipeline_nl = pipelineAssistantText;
                              } else {
                                let serverMsg = result.error || result.llm_error || result.message || '';
                                setPipelineAssistantStatus(
                                  'Error: LLM did not return a pipeline.' +
                                  (serverMsg ? `\nServer message: ${serverMsg}` : '') +
                                  (result.llm_error ? `\n\nRaw LLM output:\n${result.llm_error}` : '')
                                );
                              }
                            } catch (err) {
                              setPipelineAssistantStatus('Error: Could not process pipeline.');
                            }
                          }}
                        >Translate & Paste</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Prompt display after pipeline */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 16 }}>Prompt for LLM</span>
                  <button
                    style={{ padding: '4px 10px', fontSize: 13, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    onClick={() => {
                      setEditPrompt(prompt);
                      setShowPromptModal(true);
                    }}
                  >Edit</button>
                </div>
                <div style={{ background: '#f5faff', border: '2px solid #90caf9', borderRadius: 10, padding: 12, minHeight: 80, maxHeight: 960, fontSize: 14, fontFamily: 'monospace', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'auto', whiteSpace: 'pre-wrap', width: '100%', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {prompt || '(No prompt set)'}
                </div>
              </div>
      {/* Prompt Edit Modal */}
      {showPromptModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: 48,
            borderRadius: 16,
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            minWidth: 700,
            maxWidth: 900,
            minHeight: 400,
            maxHeight: 700,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start'
          }}>
            <h2 style={{ marginBottom: 32, fontSize: 28 }}>Edit Prompt for Ollama</h2>
            <textarea
              value={editPrompt}
              onChange={e => setEditPrompt(e.target.value)}
              style={{ width: '100%', minHeight: 600, maxHeight: 600, padding: 16, fontSize: 17, fontFamily: 'monospace', resize: 'vertical', borderRadius: 8, border: '1.5px solid #90caf9' }}
              placeholder="Enter prompt for Ollama..."
              wrap="soft"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 32 }}>
              <button
                style={{ padding: '10px 24px', fontSize: 16, background: '#aaa', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                onClick={() => {
                  setShowPromptModal(false);
                }}
              >Cancel</button>
              <button
                style={{ padding: '10px 24px', fontSize: 16, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                onClick={async () => {
                  setPromptStatus('Saving...');
                  try {
                    const response = await fetch('http://127.0.0.1:5000/api/save_config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: selectedProjectObj.name,
                        config: {
                          ...selectedProjectObj.config,
                          prompt: editPrompt
                        }
                      })
                    });
                    const result = await response.json();
                    if (result.status === 'saved') {
                      setPrompt(editPrompt);
                      setPromptStatus('Prompt saved!');
                      setShowPromptModal(false);
                      // Reload projects
                      const reload = await fetch('http://127.0.0.1:5000/api/load_configs');
                      const reloadResult = await reload.json();
                      setProjects(reloadResult.configs || []);
                    } else {
                      setPromptStatus('Error: Failed to save prompt.');
                    }
                  } catch (err) {
                    setPromptStatus('Error: Could not save prompt.');
                  }
                }}
              >Save</button>
            </div>
            {promptStatus && (
              <div style={{ color: promptStatus.startsWith('Error') ? 'red' : 'green', marginTop: 16, fontSize: 16 }}>{promptStatus}</div>
            )}
          </div>
        </div>
      )}
            </div>
          )}
        </div>

        {/* Report column: Sample docs and LLM result */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedProjectObj && (
            <div style={{
              marginTop: 0,
              background: '#e3f2fd',
              borderRadius: 16,
              padding: '16px 10px', // reduced padding
              fontFamily: 'monospace',
              minHeight: 800,
              maxHeight: 1200,
              width: '100%',
              overflow: 'auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontWeight: 'bold', fontSize: 20 }}>Sample Documents</h3>
                <button
                  style={{ padding: '8px 18px', fontSize: 15, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  onClick={() => {
                    // Merge docs and LLM output
                    const merged = sampleDocs.map((doc, idx) => ({ ...doc, llm_output: llmResults[idx] }));
                    const jsonStr = JSON.stringify(merged, null, 2);
                    // Download as JSON file
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'processed_docs.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  disabled={sampleDocs.length === 0}
                >Export as JSON</button>
              </div>
              {loadingSamples && <div>Loading samples...</div>}
              {sampleError && <div style={{ color: 'red' }}>{sampleError}</div>}
              <div style={{ display: 'flex', flexDirection: 'row', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                {sampleDocs.map((doc, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* First row: sample doc */}
                    <div style={{ background: '#fff', border: '2px solid #90caf9', borderRadius: 10, padding: 12, minWidth: 280, maxWidth: 340, fontSize: 14, fontFamily: 'monospace', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', minHeight: 320, maxHeight: 320, overflow: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', whiteSpace: 'pre-wrap' }}>
                      <div style={{ marginBottom: 6, color: '#1976d2', fontWeight: 'bold', fontSize: 16 }}>Doc {idx + 1}</div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14 }}>{JSON.stringify(doc, null, 2)}</pre>
                    </div>
                    {/* Second row: LLM result, same layout */}
                    <div style={{ background: '#fff', border: '2px solid #90caf9', borderRadius: 10, padding: 12, minWidth: 280, maxWidth: 340, fontSize: 14, fontFamily: 'monospace', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', minHeight: 400, maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', whiteSpace: 'pre-wrap', marginTop: 8 }}>
                      <div style={{ marginBottom: 6, color: '#388e3c', fontWeight: 'bold', fontSize: 16 }}>LLM Evaluation</div>
                      {llmLoading[idx] ? (
                        <div style={{ color: '#1976d2', fontStyle: 'italic', fontSize: 15 }}>Processing...</div>
                      ) : llmError[idx] ? (
                        <div style={{ color: 'red', fontSize: 14 }}>
                          {llmError[idx]}
                          {typeof llmResults[idx] === 'string' && llmResults[idx].toLowerCase().includes('error') && (
                            <pre style={{ color: 'red', fontSize: 13, marginTop: 8 }}>{llmResults[idx]}</pre>
                          )}
                        </div>
                      ) : (
                        <div style={{ margin: 0, wordBreak: 'break-word', fontSize: 14, overflow: 'auto', maxHeight: 360, whiteSpace: 'pre-wrap' }}>{llmResults[idx]}</div>
                      )}
                      {/* Manual re-evaluate button */}
                      <button
                        style={{ position: 'absolute', top: 10, right: 10, padding: '4px 10px', fontSize: 13, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        disabled={llmLoading[idx]}
                        onClick={async () => {
                          // Mark loading
                          setLlmLoading(prev => {
                            const arr = [...prev];
                            arr[idx] = true;
                            return arr;
                          });
                          setLlmError(prev => {
                            const arr = [...prev];
                            arr[idx] = '';
                            return arr;
                          });
                          try {
                            const response = await fetch('http://127.0.0.1:5000/api/process_llm', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                prompt: prompt,
                                doc: doc
                              })
                            });
                            const result = await response.json();
                            setLlmResults(prev => {
                              const arr = [...prev];
                              arr[idx] = result.llm_result || '(No result)';
                              return arr;
                            });
                          } catch (err) {
                            setLlmError(prev => {
                              const arr = [...prev];
                              arr[idx] = 'Error processing LLM.';
                              return arr;
                            });
                          }
                          setLlmLoading(prev => {
                            const arr = [...prev];
                            arr[idx] = false;
                            return arr;
                          });
                        }}
                      >{llmLoading[idx] ? 'Processing...' : 'Evaluate with LLM'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {showEditPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
            minWidth: 400,
            maxWidth: 600
          }}>
            <h2 style={{ marginBottom: 24 }}>Edit Project</h2>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Project Name</label>
              <input
                type="text"
                value={editProjectName}
                onChange={e => setEditProjectName(e.target.value)}
                disabled
                style={{ width: '100%', padding: 10, fontSize: 15, background: '#eee' }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>MongoDB Connection String</label>
              <input
                type="text"
                value={redactMongoUri(editMongoUri)}
                onChange={e => setEditMongoUri(e.target.value)}
                style={{ width: '100%', padding: 10, fontSize: 15 }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Collection Name</label>
              <input
                type="text"
                value={editCollection}
                onChange={e => setEditCollection(e.target.value)}
                style={{ width: '100%', padding: 10, fontSize: 15 }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Aggregation Pipeline</label>
              <textarea
                value={editPipeline}
                onChange={e => setEditPipeline(e.target.value)}
                style={{ width: '100%', height: 120, padding: 10, fontSize: 15, resize: 'vertical', overflow: 'auto', whiteSpace: 'pre', fontFamily: 'monospace' }}
              />
            </div>
            {editStatus && (
              <div style={{ color: editStatus.startsWith('Error') ? 'red' : 'green', marginBottom: 12 }}>{editStatus}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                style={{ padding: '8px 16px', fontSize: 15, background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                onClick={() => {
                  setShowEditPanel(false);
                  setEditStatus('');
                }}
              >
                Cancel
              </button>
              <button
                style={{ padding: '8px 16px', fontSize: 15, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                onClick={async () => {
                  if (!editMongoUri) {
                    setEditStatus('Error: MongoDB connection string is required.');
                    return;
                  }
                  if (!editCollection) {
                    setEditStatus('Error: Collection name is required.');
                    return;
                  }
                  let pipelineObj;
                  try {
                    pipelineObj = editPipeline ? JSON.parse(editPipeline) : [];
                  } catch (e) {
                    setEditStatus('Error: Aggregation pipeline must be valid JSON.');
                    return;
                  }
                  setEditStatus('Saving...');
                  try {
                    // Preserve the existing prompt field
                    const configToSave = {
                      ...selectedProjectObj.config,
                      mongo_uri: editMongoUri,
                      collection: editCollection,
                      pipeline: pipelineObj
                    };
                    const response = await fetch('http://127.0.0.1:5000/api/save_config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: editProjectName,
                        config: configToSave
                      })
                    });
                    const result = await response.json();
                    if (result.status === 'saved') {
                      setEditStatus('Project updated successfully!');
                      // Reload projects
                      const reload = await fetch('http://127.0.0.1:5000/api/load_configs');
                      const reloadResult = await reload.json();
                      setProjects(reloadResult.configs || []);
                      setSelectedProject(editProjectName);
                      setTimeout(() => {
                        setShowEditPanel(false);
                        setEditStatus('');
                      }, 1000);
                    } else {
                      setEditStatus('Error: Failed to update project.');
                    }
                  } catch (err) {
                    setEditStatus('Error: Could not update project.');
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
            minWidth: 400,
            maxWidth: 600
          }}>
            <h2 style={{ marginBottom: 24 }}>Add Project</h2>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                style={{ width: '100%', padding: 10, fontSize: 15 }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>MongoDB Connection String</label>
              <input
                type="text"
                value={newMongoUri}
                onChange={e => setNewMongoUri(e.target.value)}
                placeholder="mongodb://localhost/datagenie"
                style={{ width: '100%', padding: 10, fontSize: 15 }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Collection Name</label>
              <input
                type="text"
                value={newCollection}
                onChange={e => setNewCollection(e.target.value)}
                placeholder="projects"
                style={{ width: '100%', padding: 10, fontSize: 15 }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Aggregation Pipeline</label>
              <textarea
                value={newPipeline}
                onChange={e => setNewPipeline(e.target.value)}
                placeholder="[\n  { $match: { ... } },\n  { $group: { ... } }\n]"
                style={{ width: '100%', height: 120, padding: 10, fontSize: 15, resize: 'vertical', overflow: 'auto', whiteSpace: 'pre', fontFamily: 'monospace' }}
              />
            </div>
            {addStatus && (
              <div style={{ color: addStatus.startsWith('Error') ? 'red' : 'green', marginBottom: 12 }}>{addStatus}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                style={{ padding: '8px 16px', fontSize: 15, background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                onClick={() => {
                  setShowAddPanel(false);
                  setAddStatus('');
                  setNewProjectName('');
                  setNewMongoUri('');
                  setNewCollection('');
                  setNewPipeline('');
                }}
              >
                Cancel
              </button>
              <button
                style={{ padding: '8px 16px', fontSize: 15, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                onClick={async () => {
                  if (!newProjectName) {
                    setAddStatus('Error: Project name is required.');
                    return;
                  }
                  if (!newMongoUri) {
                    setAddStatus('Error: MongoDB connection string is required.');
                    return;
                  }
                  if (!newCollection) {
                    setAddStatus('Error: Collection name is required.');
                    return;
                  }
                  let pipelineObj;
                  try {
                    pipelineObj = newPipeline ? JSON.parse(newPipeline) : [];
                  } catch (e) {
                    setAddStatus('Error: Aggregation pipeline must be valid JSON.');
                    return;
                  }
                  setAddStatus('Saving...');
                  try {
                    const response = await fetch('http://127.0.0.1:5000/api/save_config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: newProjectName,
                        config: {
                          mongo_uri: newMongoUri,
                          collection: newCollection,
                          pipeline: pipelineObj
                        }
                      })
                    });
                    const result = await response.json();
                    if (result.status === 'saved') {
                      setAddStatus('Project saved successfully!');
                      // Reload projects
                      const reload = await fetch('http://127.0.0.1:5000/api/load_configs');
                      const reloadResult = await reload.json();
                      setProjects(reloadResult.configs || []);
                      setSelectedProject(newProjectName);
                      // Reset fields and close panel after short delay
                      setTimeout(() => {
                        setShowAddPanel(false);
                        setAddStatus('');
                        setNewProjectName('');
                        setNewMongoUri('');
                        setNewCollection('');
                        setNewPipeline('');
                      }, 1000);
                    } else {
                      setAddStatus('Error: Failed to save project.');
                    }
                  } catch (err) {
                    setAddStatus('Error: Could not save project.');
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
