import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const docsFiles = [
  { name: "FDP Complete System Review", file: "fdp-complete-system-review.md", category: "Core" },
  { name: "SSOT Implementation Review", file: "ssot-implementation-review.md", category: "Core" },
  { name: "Database Schema", file: "database-schema.md", category: "Technical" },
  { name: "System Architecture", file: "system-architecture.md", category: "Technical" },
  { name: "Hooks Documentation", file: "hooks-documentation.md", category: "Technical" },
  { name: "User Guide Complete", file: "user-guide-complete.md", category: "Guide" },
  { name: "System Documentation Complete", file: "system-documentation-complete.md", category: "Guide" },
  { name: "Alert System Review", file: "alert-system-review.md", category: "Control Tower" },
  { name: "Alert System Data Requirements", file: "alert-system-data-requirements.md", category: "Control Tower" },
  { name: "KPI Alert Rules Documentation", file: "kpi-alert-rules-documentation.md", category: "Control Tower" },
  { name: "FDP Control Tower Documentation", file: "fdp-control-tower-documentation.md", category: "Control Tower" },
  { name: "FDP Control Tower Review", file: "fdp-control-tower-review.md", category: "Control Tower" },
  { name: "MDP Data Requirements", file: "mdp-data-requirements.md", category: "MDP" },
  { name: "System Features Overview", file: "system-features-overview.md", category: "Features" },
  { name: "System Features", file: "system-features.md", category: "Features" },
  { name: "KPI Data Readiness Check", file: "kpi-data-readiness-check.md", category: "Features" },
  { name: "System Data Requirements", file: "system-data-requirements.md", category: "Data" },
  { name: "Test Data Scenario", file: "test-data-scenario.md", category: "Test" },
  { name: "Self Host Schema SQL", file: "self-host-schema.sql", category: "SQL" },
  { name: "Test Data All Modules SQL", file: "test-data-all-modules.sql", category: "SQL" },
  { name: "Test Data Cash Flow Direct SQL", file: "test-data-cash-flow-direct.sql", category: "SQL" },
];

const categories = ["Core", "Technical", "Guide", "Control Tower", "MDP", "Features", "Data", "Test", "SQL"];

export default function DocsDownload() {
  const [downloaded, setDownloaded] = useState<string[]>([]);

  const handleDownload = async (file: string, name: string) => {
    try {
      const response = await fetch(`/docs/${file}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setDownloaded(prev => [...prev, file]);
      toast.success(`Downloaded: ${name}`);
    } catch (error) {
      toast.error(`Failed to download: ${name}`);
    }
  };

  const handleDownloadAll = async () => {
    for (const doc of docsFiles) {
      await handleDownload(doc.file, doc.name);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    toast.success("All files downloaded!");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">FDP Documentation</h1>
          <p className="text-muted-foreground mt-1">Download all system documentation files</p>
        </div>
        <Button onClick={handleDownloadAll} size="lg">
          <Download className="mr-2 h-5 w-5" />
          Download All ({docsFiles.length} files)
        </Button>
      </div>

      {categories.map(category => {
        const categoryDocs = docsFiles.filter(d => d.category === category);
        if (categoryDocs.length === 0) return null;

        return (
          <Card key={category} className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoryDocs.map(doc => (
                <div
                  key={doc.file}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">{doc.file}</p>
                    </div>
                  </div>
                  <Button
                    variant={downloaded.includes(doc.file) ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleDownload(doc.file, doc.name)}
                  >
                    {downloaded.includes(doc.file) ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
