// Ghidra headless post-script: rename ordinal imports from a map file, demangle them,
// then write the decompiled C of every function to the output file.
// Args: <ordinal map file> <output .c file>
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.app.util.demangler.DemangledObject;
import ghidra.app.util.demangler.DemanglerUtil;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.ExternalLocation;
import ghidra.program.model.symbol.ExternalLocationIterator;
import ghidra.program.model.symbol.SourceType;

import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

public class Decompile extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        Map<String, String> names = new HashMap<>();
        for (String line : Files.readAllLines(Path.of(args[0]))) {
            String[] p = line.split(" ", 3);
            if (p.length == 3) names.put(p[0] + "#" + p[1], p[2]);
        }

        var ext = currentProgram.getExternalManager();
        for (String lib : ext.getExternalLibraryNames()) {
            ExternalLocationIterator it = ext.getExternalLocations(lib);
            while (it.hasNext()) {
                ExternalLocation loc = it.next();
                String label = loc.getLabel();
                if (!label.startsWith("Ordinal_")) continue;
                String mangled = names.get(lib.toUpperCase() + "#" + label.substring(8));
                if (mangled == null) continue;
                String name = mangled;
                var all = DemanglerUtil.demangle(currentProgram, mangled, null);
                DemangledObject dem = all == null || all.isEmpty() ? null : all.get(0);
                if (dem != null) name = dem.getNamespace() == null ? dem.getName()
                        : dem.getNamespace().getNamespaceName() + "::" + dem.getName();
                loc.setName(loc.getParentNameSpace(), name.replaceAll("[^A-Za-z0-9_:~<>]", "_"), SourceType.IMPORTED);
            }
        }

        // Code only reached through vtables or handler pointers (StarView Links): any pointer
        // into .text, in data or as an instruction operand, that is not inside a function.
        var mem = currentProgram.getMemory();
        var text = mem.getBlock(".text");
        var fm = currentProgram.getFunctionManager();
        var targets = new java.util.TreeSet<ghidra.program.model.address.Address>();
        for (var block : mem.getBlocks()) {
            if (!block.isInitialized() || block.isExecute()) continue;
            for (var a = block.getStart(); a.compareTo(block.getEnd().subtract(3)) < 0; a = a.add(4)) {
                var t = toAddr(mem.getInt(a) & 0xffffffffL);
                if (text.contains(t)) targets.add(t);
            }
        }
        for (var insn : currentProgram.getListing().getInstructions(text.getStart(), true)) {
            for (int i = 0; i < insn.getNumOperands(); i++) {
                var sc = insn.getScalar(i);
                if (sc == null) continue;
                var t = toAddr(sc.getUnsignedValue());
                if (text.contains(t) && !insn.getFlowType().isCall() && !insn.getFlowType().isJump()) targets.add(t);
            }
        }
        int created = 0;
        for (var t : targets) {
            if (fm.getFunctionContaining(t) != null) continue;
            disassemble(t);
            if (createFunction(t, null) != null) created++;
        }
        println("created " + created + " functions");

        DecompInterface di = new DecompInterface();
        di.openProgram(currentProgram);
        try (PrintWriter out = new PrintWriter(args[1])) {
            for (Function f : currentProgram.getFunctionManager().getFunctions(true)) {
                if (monitor.isCancelled()) break;
                DecompileResults r = di.decompileFunction(f, 60, monitor);
                out.println("// " + f.getEntryPoint());
                out.println(r.decompileCompleted() ? r.getDecompiledFunction().getC() : "// failed: " + f.getName());
            }
        }
    }
}
