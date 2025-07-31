import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Info, HelpCircle } from "lucide-react";
import { API_BASE_URL, CLIENT_ID } from "@/config";

interface KBDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (kbData: any) => void;
    initialKB?: any | null;
}

export const KBDialog = ({ open, onOpenChange, onSave, initialKB }: KBDialogProps) => {
    const [kbName, setKbName] = useState("");
    const [kbDescription, setKbDescription] = useState("");
    const [kbFile, setKbFile] = useState<File | null>(null);
    const [kbType, setKbType] = useState("RAG");
    const [embeddingTopK, setEmbeddingTopK] = useState(4);
    const [embeddingThreshold, setEmbeddingThreshold] = useState(0.3);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [showTopKTooltip, setShowTopKTooltip] = useState(false);
    const [showThresholdTooltip, setShowThresholdTooltip] = useState(false);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    // KB type is fixed to RAG for now

    useEffect(() => {
        if (open) {
            if (initialKB) {
                // Editing existing KB - handle both field naming conventions
                setKbName(initialKB.kb_name || initialKB.name || "");
                setKbDescription(initialKB.description || "");
                setKbType(initialKB.kb_type || "RAG");
                setEmbeddingTopK(initialKB.embedding_top_k || 4);
                setEmbeddingThreshold(initialKB.embedding_threshold || 0.3);
                setKbFile(null); // Can't prefill file input
                setShowFileUpload(false); // Start with file info, not upload box
            } else {
                // Reset form for new KB
                setKbName("");
                setKbDescription("");
                setKbFile(null);
                setKbType("RAG");
                setEmbeddingTopK(4);
                setEmbeddingThreshold(0.3);
                setShowAdvancedOptions(false);
                setShowFileUpload(true); // Show upload box for new KB
            }
            setError("");
            // Reset tooltip states
            setShowTopKTooltip(false);
            setShowThresholdTooltip(false);
        }
    }, [initialKB, open]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['.xlsx', '.csv', '.xls'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!allowedTypes.includes(fileExtension)) {
                setError(`File type ${fileExtension} is not supported. Please upload: ${allowedTypes.join(', ')}`);
                setKbFile(null);
                // Reset the input value
                event.target.value = '';
                return;
            }
            setKbFile(file);
            setError("");
        }
    };

    const handleSave = async () => {
        // Validation
        if (!kbName.trim()) {
            setError("Knowledge Base name is required");
            return;
        }

        if (kbName.trim().length < 3) {
            setError("Knowledge Base name must be at least 3 characters long");
            return;
        }

        if (kbName.trim().length > 100) {
            setError("Knowledge Base name cannot exceed 100 characters");
            return;
        }

        if (kbDescription.trim().length > 0 && kbDescription.trim().length < 5) {
            setError("Description must be at least 5 characters long");
            return;
        }

        if (kbDescription.trim().length > 1000) {
            setError("Description cannot exceed 1000 characters");
            return;
        }

        if (!initialKB && !kbFile) {
            setError("Please upload a file for the knowledge base");
            return;
        }

        setSaving(true);
        setError("");

        try {
            if (initialKB) {
                // Update existing KB (PUT request with query parameters and optional file)
                const queryParams = new URLSearchParams({
                    knowledgebase_name: kbName,
                    description: kbDescription,
                    kb_type: kbType,
                    embedding_top_k: embeddingTopK.toString(),
                    embedding_threshold: embeddingThreshold.toString()
                });

                const formData = new FormData();
                // Add file only if user selected a new one
                if (kbFile) {
                    formData.append('file', kbFile);
                }

                const response = await fetch(
                    `${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/knowledgebases/${initialKB.kb_id || initialKB.knowledgebase_id}?${queryParams}`,
                    {
                        method: 'PUT',
                        headers: {
                            'accept': 'application/json',
                        },
                        body: kbFile ? formData : undefined
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `HTTP ${response.status}`);
                }

                const result = await response.json();
                onSave(result);
            } else {
                // Create new KB (POST request with query parameters and file)
                const queryParams = new URLSearchParams({
                    knowledgebase_name: kbName,
                    description: kbDescription,
                    kb_type: kbType,
                    embedding_top_k: embeddingTopK.toString(),
                    embedding_threshold: embeddingThreshold.toString()
                });

                // For creating KB, file is required
                if (!kbFile) {
                    throw new Error("File is required for creating a new knowledge base");
                }

                const formData = new FormData();
                formData.append('file', kbFile);

                const response = await fetch(
                    `${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/knowledgebases?${queryParams}`,
                    {
                        method: 'POST',
                        headers: {
                            'accept': 'application/json',
                            // Don't set Content-Type header, let browser set it for FormData
                        },
                        body: formData
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `HTTP ${response.status}: ${errorData.detail || 'Unknown error'}`);
                }

                const result = await response.json();
                onSave(result);
            }
        } catch (error) {
            console.error('Error saving knowledge base:', error);
            setError(error instanceof Error ? error.message : 'Failed to save knowledge base');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col">
                <DialogHeader className="p-6 pb-8">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {initialKB ? "Edit Knowledge Base" : "Create Knowledge Base"}
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="mx-6 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6 flex-1 px-6 pb-3 min-h-0">
                    {/* Left Column - Form Details (scrollable) */}
                    <div className="space-y-4 overflow-y-scroll scrollbar-thin pl-1 pr-3 min-h-0">
                        <div className="space-y-2">
                            <Label htmlFor="kb-name" className="text-sm font-medium">
                                Knowledge Base Name *
                            </Label>
                            <Input
                                id="kb-name"
                                placeholder="Enter knowledge base name"
                                value={kbName}
                                onChange={(e) => setKbName(e.target.value)}
                                className="focus:ring-2 focus:ring-offset-2"
                            />
                            <p className="text-xs text-muted-foreground">
                                {kbName.length}/100 characters (minimum 3 required)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="kb-description" className="text-sm font-medium">
                                Description
                            </Label>
                            <Textarea
                                id="kb-description"
                                placeholder="Describe the purpose and content of this knowledge base"
                                value={kbDescription}
                                onChange={(e) => setKbDescription(e.target.value)}
                                rows={3}
                                className="focus:ring-2 focus:ring-offset-2 resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                {kbDescription.length}/1000 characters {kbDescription.length > 0 ? "(minimum 5 required)" : "(optional)"}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="kb-type" className="text-sm font-medium">
                                Knowledge Base Type
                            </Label>
                            <Select value={kbType} onValueChange={setKbType}>
                                <SelectTrigger className="bg-muted">
                                    <SelectValue placeholder="Select KB type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RAG">RAG</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Currently only RAG type is supported
                            </p>
                        </div>

                        {/* Top K */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="embedding-top-k">Top K: <span className="font-semibold text-primary">{embeddingTopK}</span></Label>
                                <HelpCircle 
                                    className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" 
                                    onClick={() => setShowTopKTooltip(true)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    id="embedding-top-k"
                                    type="range"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={embeddingTopK}
                                    onChange={e => setEmbeddingTopK(Number(e.target.value))}
                                    className="w-full accent-primary h-2 rounded-lg appearance-none bg-border focus:outline-none focus:ring-2 focus:ring-primary transition"
                                />
                                <span className="w-12 text-right text-sm text-muted-foreground">{embeddingTopK}</span>
                            </div>
                        </div>

                        {/* Threshold */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="embedding-threshold">Threshold: <span className="font-semibold text-primary">{embeddingThreshold.toFixed(2)}</span></Label>
                                <HelpCircle 
                                    className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" 
                                    onClick={() => setShowThresholdTooltip(true)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    id="embedding-threshold"
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={embeddingThreshold}
                                    onChange={e => setEmbeddingThreshold(Number(e.target.value))}
                                    className="w-full accent-primary h-2 rounded-lg appearance-none bg-border focus:outline-none focus:ring-2 focus:ring-primary transition"
                                />
                                <span className="w-12 text-right text-sm text-muted-foreground">{embeddingThreshold.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Advanced Options */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="show-advanced"
                                    checked={showAdvancedOptions}
                                    onChange={(e) => setShowAdvancedOptions(e.target.checked)}
                                    className="rounded"
                                />
                                <Label htmlFor="show-advanced" className="cursor-pointer text-sm font-medium">
                                    Advanced Options
                                </Label>
                            </div>

                            {showAdvancedOptions && (
                                <div className="space-y-4 p-4 bg-accent/20 rounded-lg border">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs text-muted-foreground">
                                            Advanced configuration options will be available in a future update
                                        </span>
                                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                            Coming Soon
                                        </Badge>
                                    </div>

                                    <div className="space-y-4 opacity-50">
                                        <div className="space-y-2">
                                            <Label htmlFor="embedding-model" className="text-sm font-medium">
                                                Embedding Model
                                            </Label>
                                            <Select disabled>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select embedding model (disabled)" />
                                                </SelectTrigger>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="model-key" className="text-sm font-medium">
                                                Model Key
                                            </Label>
                                            <Input
                                                id="model-key"
                                                placeholder="Enter model key (disabled)"
                                                disabled
                                                type="password"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - File Upload (fixed) */}
                    <div className="space-y-4 flex flex-col h-full min-h-0">
                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label htmlFor="kb-file" className="text-sm font-medium">
                                {initialKB ? "File" : "Upload File *"}
                            </Label>
                            
                            {/* Show file info for editing KB */}
                            {initialKB && !showFileUpload && (
                                <div className="border-2 border-border rounded-lg p-6 text-center h-48 flex flex-col items-center justify-center bg-muted/10">
                                    <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-medium text-foreground">
                                            📄 Uploaded file
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Current file is already uploaded and processed
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Created: {initialKB.created_at ? new Date(initialKB.created_at).toLocaleDateString() : 'Unknown'}
                                        </p>
                                        <input
                                            id="kb-file-replace"
                                            type="file"
                                            onChange={(e) => {
                                                handleFileChange(e);
                                                if (e.target.files?.[0]) {
                                                    setShowFileUpload(true);
                                                }
                                            }}
                                            accept=".xlsx,.csv,.xls"
                                            className="hidden"
                                            key={kbFile ? kbFile.name : 'empty-replace'}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => document.getElementById('kb-file-replace')?.click()}
                                            className="mt-3"
                                        >
                                            Replace File
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Show file upload box for new KB or when replacing file */}
                            {(!initialKB || showFileUpload) && (
                                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors h-48 flex flex-col items-center justify-center">
                                    <input
                                        id="kb-file"
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".xlsx,.csv,.xls"
                                        className="hidden"
                                        key={kbFile ? kbFile.name : 'empty'}
                                    />
                                    <label
                                        htmlFor="kb-file"
                                        className="cursor-pointer flex flex-col items-center gap-2 w-full h-full justify-center"
                                    >
                                        {!kbFile && <Upload className="w-10 h-10 text-muted-foreground" />}
                                        <div className="text-center">
                                            <p className="text-sm font-medium">
                                                {kbFile ? `📄 ${kbFile.name}` : initialKB ? "Choose a new file to replace current one" : "Choose a file to upload"}
                                            </p>
                                            {!kbFile && (
                                                <>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Drag & drop or click to browse
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Supports: XLSX, CSV, XLS
                                                    </p>
                                                </>
                                            )}
                                            {kbFile && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Click to change file
                                                </p>
                                            )}
                                        </div>
                                    </label>
                                    {initialKB && showFileUpload && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setShowFileUpload(false);
                                                setKbFile(null);
                                            }}
                                            className="mt-2 text-xs"
                                        >
                                            Cancel Replace
                                        </Button>
                                    )}
                                </div>
                            )}
                            
                            {initialKB && !showFileUpload && (
                                <p className="text-xs text-muted-foreground">
                                    Click "Replace File" to upload a new file
                                </p>
                            )}
                        </div>

                        {/* Upload Guidelines */}
                        <div className="space-y-2 flex-1">
                            <Label className="text-sm font-medium">File Guidelines</Label>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Maximum file size: 50MB</li>
                                    <li>• Supported formats: XLSX, CSV, XLS</li>
                                    <li>• For best results, use well-formatted spreadsheets</li>
                                    <li>• File should contain only two columns: `question` column and `answer` column</li>
                                    <li>• Data will be automatically processed and indexed</li>
                                    {initialKB && (
                                        <li>• Uploading a new file will replace the current one completely</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons - Fixed at bottom */}
                <div className="flex justify-end gap-2 p-6 pt-4 border-t bg-background">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : initialKB ? "Update" : "Create"}
                    </Button>
                </div>
            </DialogContent>

            {/* Top K Help Dialog */}
            <Dialog open={showTopKTooltip} onOpenChange={setShowTopKTooltip}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            Top K Parameter
                        </DialogTitle>
                        <DialogDescription>
                            Understanding the number of results parameter
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">What is Top K?</h4>
                            <p className="text-sm text-muted-foreground">
                                Controls how many relevant answers the system will find from your knowledge base when someone asks a question.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">How to choose the right value:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• <strong>Lower values (1-3):</strong> Return fewer, more focused answers</li>
                                <li>• <strong>Higher values (5-10):</strong> Return more answers but may include less relevant ones</li>
                                <li>• <strong>Recommended:</strong> Start with 4-5 for most use cases</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => setShowTopKTooltip(false)}>Got it</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Threshold Help Dialog */}
            <Dialog open={showThresholdTooltip} onOpenChange={setShowThresholdTooltip}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            Threshold Parameter
                        </DialogTitle>
                        <DialogDescription>
                            Understanding the answer quality filter
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">What is Threshold?</h4>
                            <p className="text-sm text-muted-foreground">
                                Sets the minimum similarity score (0.0 to 1.0) for answers. Only answers above this score will be returned.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">How to choose the right value:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• <strong>Higher values (0.7-1.0):</strong> Very strict, only highly relevant answers</li>
                                <li>• <strong>Medium values (0.4-0.6):</strong> Balanced relevance and coverage</li>
                                <li>• <strong>Lower values (0.1-0.3):</strong> More lenient, broader range of answers</li>
                                <li>• <strong>Recommended:</strong> Start with 0.3-0.5 for most use cases</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => setShowThresholdTooltip(false)}>Got it</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};
